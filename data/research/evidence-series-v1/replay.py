"""Replay all fixed study rows from hash-verified full native records.

Python standard library only. Run next to packet files:
  python replay.py --source-root /path/to/site
  python replay.py --base-url https://quantarenas.com
Network mode fetches public immutable manifests/objects only. It executes the
included hash-pinned arithmetic model, never downloaded strategy source.
Ranking checks use the frozen peer table; peers outside the18 study pairs are
not independently replayed. Original strategy regeneration requires original
private price inputs and is outside this recorded-arithmetic check.
"""
import argparse
import gzip
import hashlib
import importlib.util
import io
import json
import math
from pathlib import Path
import sys
import urllib.parse
import urllib.request

HERE = Path(__file__).resolve().parent
MAX = 32 * 1024 * 1024


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def near(actual, expected):
    if not math.isclose(actual, expected, rel_tol=1e-10, abs_tol=1e-10):
        raise ValueError(f'Arithmetic mismatch: {actual} != {expected}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--source-root', type=Path)
    mode.add_argument('--base-url')
    args = parser.parse_args()
    packet = json.loads((HERE/'packet.json').read_text(encoding='utf-8'))
    for name, pin in packet['sha256'].items():
        path = (HERE/name).resolve()
        if path.parent != HERE or sha(path.read_bytes()) != pin:
            raise ValueError('Packet file hash mismatch: '+name)
    study = json.loads((HERE/'cost-study.json').read_text(encoding='utf-8'))
    peers = json.loads((HERE/'rank-peers.json').read_text(encoding='utf-8'))
    protocol = study['protocol']
    if sha((HERE/'cost_scenarios.py').read_bytes()) != protocol['costModelSourceSha256']:
        raise ValueError('Cost model differs from frozen study')
    spec = importlib.util.spec_from_file_location('frozen_cost_model',HERE/'cost_scenarios.py')
    model = importlib.util.module_from_spec(spec)
    sys.dont_write_bytecode = True
    spec.loader.exec_module(model)
    cache = {}

    def fetch(relative, pin, length=None):
        if not isinstance(relative,str) or not relative.startswith('data/evidence/') or any(p in ('..','') for p in relative.split('/')):
            raise ValueError('Unexpected immutable path')
        if relative not in cache:
            if args.source_root:
                root = args.source_root.resolve()
                source = (root/relative).resolve()
                if not source.is_relative_to(root):
                    raise ValueError('Path escapes site root')
                with source.open('rb') as stream:
                    raw = stream.read(MAX+1)
            else:
                url = args.base_url.rstrip('/')+'/'+relative
                if urllib.parse.urlsplit(url).scheme != 'https':
                    raise ValueError('Network source must use HTTPS')
                with urllib.request.urlopen(url,timeout=45) as response:
                    if response.geturl() != url:
                        raise ValueError('Unexpected redirect')
                    raw = response.read(MAX+1)
            if len(raw)>MAX or (length is not None and len(raw)!=length):
                raise ValueError('Artifact byte count differs')
            cache[relative]=raw
        raw=cache[relative]
        if pin is not None and sha(raw)!=pin:
            raise ValueError('Artifact hash differs: '+relative)
        return raw

    expected={(sid,symbol,bps) for sid in protocol['strategies'] for symbol in protocol['markets'] for bps in protocol['costsBps']}
    if len(study['rows'])!=len(expected) or {(r['strategyId'],r['symbol'],r['bps']) for r in study['rows']}!=expected:
        raise ValueError('Study selection/row coverage differs')
    verified=0
    for run in study['runs']:
        manifest=json.loads(fetch(run['manifest'],run['manifestSha256']))
        if manifest['runId']!=run['runId'] or [ref['sha256'] for ref in manifest['objects']['records']]!=run['recordHashes']:
            raise ValueError('Run/record identity differs')
        rows=[]
        for ref in manifest['objects']['records']:
            compressed=fetch(ref['path'],None,ref['compressedBytes'])
            with gzip.GzipFile(fileobj=io.BytesIO(compressed)) as stream:
                raw=stream.read(MAX+1)
            if len(raw)!=ref['uncompressedBytes'] or len(raw)>MAX or sha(raw)!=ref['sha256']:
                raise ValueError('Record chunk differs')
            rows.extend(json.loads(raw)['rows'])
        result=model.build_cost_scenarios(manifest,rows,costs_bps=protocol['costsBps'])
        chosen=[row for row in study['rows'] if row['runId']==run['runId']]
        for row in chosen:
            if row['status']!='complete':
                raise ValueError('Unavailable study row retained; complete replay cannot be claimed')
            measured=model.window_metrics(result,row['bps'],start=row['start'],end=row['end'])
            for key,metric in [('netTotalReturn','totalReturn'),('netCagr','cagr'),('feesPaid','totalFeesPaid'),('turnover','chargedTurnover')]:
                near(measured['strategy'][metric],row[key])
            near(measured['benchmark']['totalReturn'],row['benchmarkTotalReturn'])
            near(measured['excessReturn'],row['excessReturn'])
            cohort=[p for p in peers if p['cohortId']==row['cohortId']]
            if any(p['context']!=row['context'] for p in cohort):
                raise ValueError('Mixed peer contexts')
            rank=1+sum(p['returns'][format(row['bps'],'g')]>row['netTotalReturn'] for p in cohort)
            zero=1+sum(p['returns']['0']>row['grossTotalReturn'] for p in cohort)
            if rank!=row['rank']['value'] or zero-rank!=row['rank']['deltaFromZeroCost'] or len(cohort)!=row['rank']['cohortSize']:
                raise ValueError('Frozen cohort rank differs')
            verified+=1
    if verified!=72:
        raise ValueError('Expected all72 fixed scenarios')
    print(json.dumps({'status':'passed','fullRecordReplayRows':verified,'pairs':len(study['runs']),
                      'negativeNetRows':sum(row['netTotalReturn']<0 for row in study['rows']),
                      'immutableFilesRead':len(cache),'rankingScope':'Frozen complete cohort table; only study pairs have native-record replay'}))


if __name__=='__main__':
    main()
