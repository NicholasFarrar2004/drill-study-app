"""Synthetic persistence and HTTP tests. Never opens the normal study database."""
import sys
sys.dont_write_bytecode = True
import json, tempfile, unittest, threading
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import Store, from_export, Handler, HTTPServer

class StorageTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / 'test.sqlite3'
        self.store = Store(self.path)
        self.docs = {'state/notes': {'map': {'demo-parcel-flow:1': 'Review packing.'}},
                     'attempts/demo-attempt': {'id':'demo-attempt','testId':'demo-parcel-flow','title':'Demo',
                         'mode':'practice','refs':[['demo-parcel-flow',1]],'answers':[1],
                         'checked':[True],'i':0,'max':0,'done':True,'elapsed':1000}}
    def tearDown(self):
        self.store.db.close()
        self.tmp.cleanup()
    def test_empty_start(self):
        self.assertEqual(self.store.snapshot(), {'revision':0,'documents':{}})
    def test_reopen_persists(self):
        self.store.seed(self.docs)
        other = Store(self.path)
        try: self.assertEqual(other.snapshot()['documents'], self.docs)
        finally: other.db.close()
    def test_export_roundtrip(self):
        self.store.seed(self.docs)
        self.assertEqual(from_export(dict(app='Drill',schemaVersion=2,**self.store.snapshot())), self.docs)
    def test_nonempty_import_refused(self):
        self.store.seed(self.docs)
        before = self.store.snapshot()
        with self.assertRaises(ValueError): self.store.seed({'state/flags':{'list':[]}})
        self.assertEqual(self.store.snapshot(),before)
    def test_stale_revision_keeps_first_write(self):
        self.store.mutate(dict(revision=0,path='state/flags',value={'list':['demo-parcel-flow:1']}))
        with self.assertRaises(ValueError): self.store.mutate(dict(revision=0,path='state/flags',value={'list':[]}))
        self.assertEqual(self.store.snapshot()['documents']['state/flags']['list'],['demo-parcel-flow:1'])
    def test_completed_attempt_delete_refused(self):
        self.store.seed(self.docs)
        with self.assertRaises(ValueError): self.store.mutate(dict(revision=1,path='attempts/demo-attempt',delete=True))
        self.assertIn('attempts/demo-attempt',self.store.snapshot()['documents'])
    def test_unfinished_attempt_can_be_discarded(self):
        self.docs['attempts/demo-attempt']['done']=False
        self.store.seed(self.docs)
        self.store.mutate(dict(revision=1,path='attempts/demo-attempt',delete=True))
        self.assertNotIn('attempts/demo-attempt',self.store.snapshot()['documents'])
    def test_backup_restorable(self):
        self.store.seed(self.docs)
        backup=Store(self.store.backup())
        try: self.assertEqual(backup.snapshot(),self.store.snapshot())
        finally: backup.db.close()
    def test_malformed_import_atomic(self):
        self.docs['attempts/demo-attempt']['answers']=[]
        with self.assertRaises(ValueError): self.store.seed(self.docs)
        self.assertEqual(self.store.snapshot()['documents'],{})
    def test_unknown_path_rejected(self):
        with self.assertRaises(ValueError): from_export({'app':'Drill','schemaVersion':2,'documents':{'invalid/path':{}}})

class HTTPTests(unittest.TestCase):
    def test_local_demo_end_to_end_and_origin_guard(self):
        # SQLite connection is created and used on the same server thread.
        with tempfile.TemporaryDirectory() as tmp:
            http=HTTPServer(('127.0.0.1',0),Handler)
            ready=threading.Event()
            def serve():
                http.store=Store(Path(tmp)/'http.sqlite3')
                ready.set()
                try: http.serve_forever(poll_interval=.01)
                finally: http.store.db.close()
            thread=threading.Thread(target=serve); thread.start(); ready.wait()
            base=f'http://127.0.0.1:{http.server_port}'
            def request(path,body=None,headers=None):
                h={'Content-Type':'application/json',**(headers or {})}
                req=Request(base+path,data=None if body is None else json.dumps(body).encode(),headers=h)
                with urlopen(req) as r: return r.read()
            try:
                self.assertIn(b'Parcel flow at Cedar Workshop',request('/'))
                self.assertEqual(json.loads(request('/api/state')),{'revision':0,'documents':{}})
                self.assertEqual(json.loads(request('/api/write',{'revision':0,'path':'state/flags','value':{'list':['demo-parcel-flow:1']}})),{'revision':1})
                backup=json.loads(request('/api/export'))
                self.assertEqual(backup['schemaVersion'],2)
                self.assertEqual(backup['documents']['state/flags']['list'],['demo-parcel-flow:1'])
                with self.assertRaises(HTTPError) as blocked: request('/api/state',headers={'Origin':'https://invalid.example'})
                self.assertEqual(blocked.exception.code,403)
                with self.assertRaises(HTTPError) as conflict: request('/api/import',backup)
                self.assertEqual(conflict.exception.code,409)
                self.assertEqual(json.loads(request('/api/state'))['documents'],backup['documents'])
            finally:
                http.shutdown(); thread.join(); http.server_close()
if __name__ == '__main__': unittest.main()
