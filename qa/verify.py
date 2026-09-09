"""Run all local checks against the shipped HTML, using disposable data only."""
import json,re,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def run(*args):
    result=subprocess.run(args,cwd=ROOT,text=True,capture_output=True)
    if result.returncode:
        print(result.stdout,result.stderr);raise SystemExit(result.returncode)
    return result.stdout+result.stderr
for script in ('test.js','version-check.js','review-loop.js','completion-stack.js','word-bank.js','course-terms.js'):
    out=run('node','qa/'+script)
    print(script+': '+str(len(re.findall(r'^ok -',out,re.M)))+' assertions passed')
print(run('node','qa/content-check.js','drill.html').strip())
print(run('python3','-B','qa/test_storage.py').strip())
with tempfile.TemporaryDirectory() as tmp:
    candidate=Path(tmp)/'candidate.html'
    print(run('node','append-test.mjs','drill.html','examples/additional-lesson.json',str(candidate)).strip())
    print(run('node','qa/content-check.js',str(candidate)).strip())
    duplicate=subprocess.run(['node','append-test.mjs',str(candidate),'examples/additional-lesson.json',str(Path(tmp)/'duplicate.html')],cwd=ROOT,capture_output=True,text=True)
    assert duplicate.returncode and 'Test id already exists' in duplicate.stderr
    overwrite=subprocess.run(['node','append-test.mjs','drill.html','examples/additional-lesson.json',str(candidate)],cwd=ROOT,capture_output=True,text=True)
    assert overwrite.returncode and 'never overwrites' in overwrite.stderr
    assert not (Path(tmp)/'duplicate.html').exists()
    malicious=json.loads((ROOT/'examples/additional-lesson.json').read_text())
    malicious['questions'][0]['img']='data:image/webp;base64,x" onerror="alert(1)'
    malicious['questions'][0]['alt']='example'
    badinput=Path(tmp)/'bad.json';badinput.write_text(json.dumps(malicious))
    rejected=subprocess.run(['node','append-test.mjs','drill.html',str(badinput),str(Path(tmp)/'bad.html')],cwd=ROOT,capture_output=True,text=True)
    assert rejected.returncode and 'complete base64' in rejected.stderr
    assert not (Path(tmp)/'bad.html').exists()
    malicious['questions'][0]['img']='https://images.invalid.example/picture.png'
    badinput.write_text(json.dumps(malicious))
    rejected=subprocess.run(['node','append-test.mjs','drill.html',str(badinput),str(Path(tmp)/'remote.html')],cwd=ROOT,capture_output=True,text=True)
    assert rejected.returncode and 'complete base64' in rejected.stderr
    assert not (Path(tmp)/'remote.html').exists()
print('Append checks: original lessons preserved; duplicate ID, overwrite, malformed image, and remote image refused.')
assert not (ROOT/'Data').exists(), 'The shipped tree should have no personal study database.'
print('Distribution starts without saved study data.')
