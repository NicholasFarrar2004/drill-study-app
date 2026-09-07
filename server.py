#!/usr/bin/env python3
"""Private Drill server. Standard library only; binds exclusively to loopback."""
import argparse, json, sqlite3, time, re
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlsplit
ROOT = Path(__file__).resolve().parent

def valid_docs(docs):
    if not isinstance(docs, dict) or len(docs) > 10000: raise ValueError('Invalid documents')
    for path, value in docs.items():
        if not re.fullmatch(r'(attempts/[^/]{1,200}|state/(sched|flags|archive|notes|carried))', path): raise ValueError('Unknown document path')
        if not isinstance(value, dict): raise ValueError('Invalid document')
        if path.startswith('attempts/'):
            n = len(value.get('refs', []))
            if not n or value.get('id') != path[9:] or len(value.get('answers', [])) != n or len(value.get('checked', [])) != n: raise ValueError('Invalid attempt arrays')
            if not 0 <= value.get('i', -1) <= value.get('max', -1) < n: raise ValueError('Invalid attempt position')
        elif path in ('state/archive','state/flags','state/carried'):
            if not isinstance(value.get('list'),list) or not all(isinstance(x,str) for x in value['list']): raise ValueError('Invalid list')
        elif not isinstance(value.get('q' if path=='state/sched' else 'map'),dict): raise ValueError('Invalid state map')
    return docs

def from_export(data):
    if data.get('app') != 'Drill': raise ValueError('Not a Drill backup')
    if data.get('schemaVersion') == 2: return valid_docs(data['documents'])
    if data.get('schemaVersion') != 1: raise ValueError('Unsupported backup version')
    def stamp(v):
        from datetime import datetime
        return int(datetime.fromisoformat(v.replace('Z','+00:00')).timestamp()*1000) if v else None
    docs = {'state/sched':{'q':data['schedule']}, 'state/flags':{'list':data['flags']},
            'state/archive':{'list':data['archived']}, 'state/notes':{'map':{n['ref']:n['note'] for n in data['notes']}},'state/carried':{'list':[]}}
    for a in data['attempts']:
        refs = [[x['ref'].rsplit(':',1)[0],int(x['ref'].rsplit(':',1)[1])] for x in a['answers']]
        v = {k:a[k] for k in ('id','testId','title','mode','done')}
        v.update(refs=refs,answers=[x['answer'] for x in a['answers']],checked=[x['checked'] for x in a['answers']],i=a['position'],max=a['furthest'],elapsed=a['elapsedMs'],startedAt=stamp(a['startedAt']),finishedAt=stamp(a['finishedAt']))
        docs['attempts/'+a['id']] = v
    return valid_docs(docs)

class Store:
    def __init__(self, path):
        self.path=Path(path); self.path.parent.mkdir(parents=True,exist_ok=True)
        self.db=sqlite3.connect(path)
        self.db.execute('CREATE TABLE IF NOT EXISTS docs(path TEXT PRIMARY KEY, value TEXT)')
        self.db.execute('CREATE TABLE IF NOT EXISTS meta(revision INTEGER)')
        if not self.db.execute('SELECT * FROM meta').fetchone(): self.db.execute('INSERT INTO meta VALUES(0)')
        self.db.commit()
    def snapshot(self):
        return {'revision':self.db.execute('SELECT revision FROM meta').fetchone()[0], 'documents':{k:json.loads(v) for k,v in self.db.execute('SELECT * FROM docs')}}
    def backup(self):
        dest=self.path.parent/'Backups'; dest.mkdir(exist_ok=True)
        path=dest/f'drill-{time.time_ns()}.sqlite3'
        with sqlite3.connect(path) as out: self.db.backup(out)
        return str(path)
    def seed(self, docs):
        if self.snapshot()['documents']: raise ValueError('Destination already contains study data')
        with self.db:
            self.db.executemany('INSERT INTO docs VALUES(?,?)', [(k,json.dumps(v)) for k,v in valid_docs(docs).items()])
            self.db.execute('UPDATE meta SET revision=revision+1')
    def mutate(self, data):
        if data['revision'] != self.snapshot()['revision']: raise ValueError('Another tab changed your study data. Save a recovery file, then reload.')
        path=data['path']
        if data.get('delete'):
            row=self.snapshot()['documents'].get(path)
            if not path.startswith('attempts/') or not row or row.get('done') is not False: raise ValueError('Only unfinished attempts can be discarded')
        else: valid_docs({path:data['value']})
        with self.db:
            if data.get('delete'): self.db.execute('DELETE FROM docs WHERE path=?',(path,))
            else: self.db.execute('INSERT OR REPLACE INTO docs VALUES(?,?)',(path,json.dumps(data['value'])))
            self.db.execute('UPDATE meta SET revision=revision+1')
        return {'revision':self.snapshot()['revision']}

class Handler(BaseHTTPRequestHandler):
    def reply(self,status,value,ctype='application/json'):
        blob=json.dumps(value).encode() if ctype=='application/json' else value
        self.send_response(status); self.send_header('Content-Type',ctype); self.send_header('Content-Length',str(len(blob)))
        self.send_header('Cache-Control','no-store'); self.send_header('X-Content-Type-Options','nosniff'); self.send_header('Referrer-Policy','no-referrer'); self.end_headers(); self.wfile.write(blob)
    def allowed(self):
        origin='http://'+self.headers.get('Host','')
        return self.headers.get('Host')==f'127.0.0.1:{self.server.server_port}' and self.headers.get('Origin',origin)==origin and self.headers.get('Sec-Fetch-Site','none') in ('none','same-origin')
    def do_GET(self):
        if not self.allowed(): return self.reply(403,{'error':'Open Drill using its 127.0.0.1 address'})
        path=urlsplit(self.path).path
        if path=='/api/state': return self.reply(200,self.server.store.snapshot())
        if path=='/api/export': return self.reply(200,dict(app='Drill',schemaVersion=2,exportedAt=time.time(),**self.server.store.snapshot()))
        files={'/':'drill.html','/drill.html':'drill.html','/runtime.js':'runtime.js'}
        if path not in files: return self.reply(404,{'error':'Not found'})
        self.reply(200,(ROOT/files[path]).read_bytes(),'text/html; charset=utf-8' if files[path].endswith('html') else 'text/javascript; charset=utf-8')
    def do_POST(self):
        if not self.allowed() or self.headers.get('Content-Type')!='application/json': return self.reply(403,{'error':'Same-origin JSON required'})
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=16000000: raise ValueError('Invalid request size')
            data=json.loads(self.rfile.read(length))
            if self.path=='/api/write': result=self.server.store.mutate(data)
            elif self.path=='/api/import':
                docs=from_export(data); self.server.store.backup(); self.server.store.seed(docs); result=self.server.store.snapshot()
            else: return self.reply(404,{'error':'Not found'})
            self.reply(200,result)
        except (ValueError,KeyError,TypeError) as e: self.reply(409,{'error':str(e)})
        except Exception: self.reply(500,{'error':'Storage failed. Your prior saved data remains on disk.'})
    def log_message(self,*args): pass

if __name__=='__main__':
    p=argparse.ArgumentParser(); p.add_argument('--port',type=int,default=8765); p.add_argument('--data',default=str(ROOT/'Data'/'drill.sqlite3')); p.add_argument('--seed'); args=p.parse_args()
    store=Store(args.data)
    if args.seed: store.seed(from_export(json.loads(Path(args.seed).read_text())))
    store.backup()
    server=HTTPServer(('127.0.0.1',args.port),Handler); server.store=store
    print(f'Drill ready: http://127.0.0.1:{args.port}',flush=True)
    server.serve_forever()
