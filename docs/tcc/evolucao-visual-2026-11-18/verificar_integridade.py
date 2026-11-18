"""Confere fontes e imagens do caderno; não executa a aplicação nem altera arquivos."""

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import subprocess
import sys


def digest(data):
    return hashlib.sha256(data).hexdigest()


def verify(folder, repository=None):
    manifest = json.loads((folder / 'manifesto.json').read_text(encoding='utf-8'))
    images = manifest['images']
    checks = []

    def check(condition, description):
        checks.append({'passed': bool(condition), 'check': description})

    check(len(images) == 15, 'Quinze imagens catalogadas')
    check([x['number'] for x in images] == list(range(1, 16)), 'Numeração de 01 a 15')
    counts = Counter(x['kind'] for x in images)
    check(counts['captura_preservada'] == 8, 'Oito capturas preservadas')
    check(counts['figura_de_codigo'] == 4, 'Quatro figuras de código')
    check(manifest['firstAvailableCommitDate'] == '2026-10-30', 'Primeiro commit identificado em 30/10')
    for image in images:
        data = (folder / image['file']).read_bytes()
        check(digest(data) == image['sha256'], 'SHA-256: ' + image['file'])
        if image['kind'] == 'captura_preservada':
            archived = folder / 'fontes_relatorios' / image['sourceFiles'][0]
            check(data == archived.read_bytes(), 'Captura sem alteração: ' + image['file'])
            if repository:
                blob = subprocess.check_output(
                    ['git', 'show', image['firstGitCommit'] + ':' + image['sourceFiles'][0]],
                    cwd=repository,
                )
                check(data == blob, 'Captura igual ao primeiro registro Git: ' + image['file'])
        elif image['kind'] == 'figura_de_codigo':
            raw = (folder / image['sourceArchive']).read_bytes()
            check(digest(raw) == image['sourceBlobSha256'], 'Código arquivado íntegro: ' + image['sourceFiles'][0])
            lines = raw.decode('utf-8-sig').splitlines()
            selected = lines[image['sourceStartLine'] - 1:image['sourceEndLine']]
            check(selected == image['sourceLines'], 'Trecho e números de linha: ' + image['file'])
            check(image['sourceCommit'] == manifest['firstAvailableCommit'], 'Versão de origem: ' + image['file'])
            if repository:
                blob = subprocess.check_output(
                    ['git', 'show', image['sourceCommit'] + ':' + image['sourceFiles'][0]],
                    cwd=repository,
                )
                check(raw == blob, 'Código igual ao objeto Git: ' + image['sourceFiles'][0])

    for source, expected in manifest['sourceSha256'].items():
        archived = folder / 'fontes_relatorios' / source
        check(digest(archived.read_bytes()) == expected, 'Fonte arquivada íntegra: ' + source)
        if repository:
            current = (repository / source).read_bytes()
            saved = archived.read_bytes()
            # O Git normaliza finais de linha de texto; JPGs e arquivos arquivados exigem bytes exatos.
            same = current == saved or (archived.suffix in {'.json', '.md', '.log'}
                                       and current.replace(b'\r\n', b'\n') == saved.replace(b'\r\n', b'\n'))
            check(same, 'Fonte do repositório compatível (texto permite CRLF/LF): ' + source)

    commits = json.loads((folder / 'historico-git.json').read_text(encoding='utf-8'))
    by_sha = {row['sha']: row for row in commits}
    check(commits[0]['sha'] == manifest['firstAvailableCommit'], 'Início do histórico Git exportado')
    check(commits[-1]['sha'] == manifest['repositoryHeadAtCollection'], 'Fim do histórico na revisão de coleta')
    for selected in images[13]['selectedCommits']:
        check(selected == by_sha[selected['sha']], 'Commit do quadro presente no histórico: ' + selected['sha'][:7])
    if repository:
        for commit in commits:
            actual = subprocess.check_output(
                ['git', 'show', '-s', '--format=%H%n%aI%n%cI%n%s', commit['sha']],
                cwd=repository,
            ).decode('utf-8').splitlines()
            check(actual == [commit['sha'], commit['authorDate'], commit['committerDate'], commit['subject']],
                  'Metadados Git: ' + commit['sha'][:7])

    for source, level in zip(images[14]['sourceFiles'], ['HIGH', 'LOW', 'HIGH']):
        capture = json.loads((folder / 'fontes_relatorios' / source).read_text(encoding='utf-8-sig'))
        check(capture['result'] == 'passed' and capture['levelSamples'] == 8
              and capture['observedLevels'] == [level] and not capture['sensorTested']
              and not capture['temperatureTested'] and not capture['apiUsed'],
              'Escopo e oito níveis ' + level + ': ' + source)

    failed = sum(not row['passed'] for row in checks)
    return {'result': 'passed' if failed == 0 else 'failed', 'checks': len(checks),
            'failures': failed, 'repositoryCompared': repository is not None,
            'scope': 'Integridade documental; sem nova execução da aplicação ou de hardware',
            'details': checks}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repositorio', type=Path, help='Raiz opcional do repositório ICEPLAY')
    args = parser.parse_args()
    try:
        result = verify(Path(__file__).resolve().parent, args.repositorio.resolve() if args.repositorio else None)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(0 if result['result'] == 'passed' else 1)
    except (OSError, KeyError, ValueError, subprocess.CalledProcessError) as error:
        print(json.dumps({'result': 'failed', 'error': str(error)}, ensure_ascii=False))
        sys.exit(1)
