#!/usr/bin/env python3
"""Google Cloud TTS(Chirp 3 HD)로 대사를 미리 녹음한다. 맥에서만 실행.

키는 환경 변수 GOOGLE_TTS_API_KEY(GitHub Actions 비밀값) 또는 macOS 키체인
(service=haneulseom, account=google-tts-api-key)에서 읽고, 절대 출력하지 않는다.

사용:
  /usr/bin/python3 -I scripts/voice/gen.py samples           # scripts/voice/samples.json → public/voice-samples/
  /usr/bin/python3 -I scripts/voice/gen.py build             # scripts/voice/lines.json → public/voice/*.mp3 + index.json
"""
import base64
import hashlib
import json
import os
import subprocess
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LINES = os.path.join(ROOT, 'scripts', 'voice', 'lines.json')
OUT = os.path.join(ROOT, 'public', 'voice')
API = 'https://texttospeech.googleapis.com/v1/text:synthesize'


def api_key() -> str:
    env = os.environ.get('GOOGLE_TTS_API_KEY', '').strip()
    if env:
        return env
    try:
        return subprocess.run(
            ['security', 'find-generic-password', '-s', 'haneulseom', '-a', 'google-tts-api-key', '-w'],
            check=True, capture_output=True, text=True, timeout=60,
        ).stdout.strip()
    except subprocess.CalledProcessError:
        sys.exit('키체인에 키가 없어요 (haneulseom / google-tts-api-key)')


def synth(key: str, text: str, voice: str, encoding: str = 'MP3', rate: float = 1.0) -> bytes:
    lang = voice[:5]
    body = {
        'input': {'text': text},
        'voice': {'languageCode': lang, 'name': voice},
        'audioConfig': {'audioEncoding': encoding, 'speakingRate': rate},
    }
    req = urllib.request.Request(API, data=json.dumps(body).encode(), method='POST',
                                 headers={'Content-Type': 'application/json', 'X-Goog-Api-Key': key})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return base64.b64decode(json.load(r)['audioContent'])
    except urllib.error.HTTPError as e:
        msg = e.read().decode(errors='replace')
        # 오류 메시지에 키가 섞여 나오지 않도록 길이만 제한해서 보여 준다
        sys.exit(f'TTS 오류 {e.code}: {msg[:300]}')


def samples(key: str):
    """scripts/voice/samples.json → public/voice-samples/*.mp3 + list.json (목소리 고르기 페이지용)"""
    spec = json.load(open(os.path.join(ROOT, 'scripts', 'voice', 'samples.json'), encoding='utf-8'))
    outdir = os.path.join(ROOT, 'public', 'voice-samples')
    os.makedirs(outdir, exist_ok=True)
    out = []
    for group in spec['groups']:
        items = []
        for v in group['voices']:
            name = f'{group["id"]}-{v.split("-")[-1]}.mp3'
            path = os.path.join(outdir, name)
            if not os.path.exists(path):
                with open(path, 'wb') as f:
                    f.write(synth(key, group['text'], v, 'MP3', group.get('rate', 1.0)))
            items.append({'voice': v.split('-')[-1], 'file': name})
        out.append({'title': group['title'], 'text': group['text'], 'items': items})
    with open(os.path.join(outdir, 'list.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f'샘플 {sum(len(g["items"]) for g in out)}개')


def build(key: str):
    spec = json.load(open(LINES, encoding='utf-8'))
    voices = spec['voices']  # {"ko": "ko-KR-Chirp3-HD-…", "en": "en-US-Chirp3-HD-…"}
    os.makedirs(OUT, exist_ok=True)
    index = {}
    made = skipped = 0
    for line in spec['lines']:
        voice = voices[line.get('lang', 'ko')]
        rate = line.get('rate', spec.get('rate', {}).get(line.get('lang', 'ko'), 1.0))
        h = hashlib.sha1(f'{voice}|{rate}|{line["text"]}'.encode()).hexdigest()[:10]
        name = f'{line["id"]}.{h}.mp3'
        path = os.path.join(OUT, name)
        if not os.path.exists(path):
            with open(path, 'wb') as f:
                f.write(synth(key, line['text'], voice, 'MP3', rate))
            made += 1
        else:
            skipped += 1
        index[line['id']] = {'file': f'voice/{name}', 'text': line['text']}
    # 더 이상 쓰지 않는 파일 정리
    keep = {v['file'].split('/')[-1] for v in index.values()}
    for f in os.listdir(OUT):
        if f.endswith('.mp3') and f not in keep:
            os.remove(os.path.join(OUT, f))
    with open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=1)
    print(f'새로 녹음 {made}개, 그대로 {skipped}개, 총 {len(index)}개')


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'samples':
        samples(api_key())
    elif cmd == 'build':
        build(api_key())
    else:
        print(__doc__)
