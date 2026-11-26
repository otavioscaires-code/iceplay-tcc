"""Concorrencia HTTP/SQLite com fixtures isoladas; nao e ensaio de sensor."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import datetime as dt
import sqlite3
import threading
import uuid
from verification_http import ApiVerification

parser = argparse.ArgumentParser()
for name in ('dotnet', 'database', 'evidence'):
    parser.add_argument('--' + name, required=True)
args = parser.parse_args()
test = ApiVerification(args.dotnet, args.database, args.evidence, 'estabilidade')
test.report['scope'] = 'Software HTTP/SQLite isolado, com ate8 clientes simultaneos. Hardware e apenas fixture de autenticacao; sem sensores ou validacao no notebook da apresentacao.'
test.report['criteriaDefinedBeforeRequests'] = {
    'concurrentClients': 8, 'duplicateBatchRequests': 8,
    'distinctAuthenticatedMeasurements': 16, 'copiesPerMeasurement': 4,
    'initialSimulationReadings': 100, 'concurrentSimulationWrites': 40,
    'concurrentHistoryQueries': 20, 'historyPageSize': 37,
    'acceptedStatusesMustMatchPersistence': True,
    'fixedCutoffPaginationMustReturnOnlyInitialSimulationCohort': True,
    'restartMustPreserveAcceptedReadingsAndCredentials': True,
}
error = None

def stamp(value=None):
    return (value or dt.datetime.now(dt.timezone.utc) - dt.timedelta(milliseconds=100)).isoformat().replace('+00:00', 'Z')

try:
    test.start('inicio')
    fridge, _ = test.request('/api/geladeiras', 201, 'POST', {'nome': 'FIXTURE ESTABILIDADE - BANCO ISOLADO'})
    fridge_id = fridge['id']
    route = f'/api/geladeiras/{fridge_id}/dispositivos'
    issued, _ = test.request(route, 201, 'POST', {'nome': 'EMISSOR DE SOFTWARE - NAO E ESP32'})
    device_id = issued['dispositivo']['id']
    auth = {'Authorization': 'Bearer ' + issued['credencial']}
    body = {'geladeiraId': fridge_id, 'temperaturaC': 0, 'portaAberta': False, 'origem': 'Hardware', 'medidoEmUtc': stamp(), 'medicaoId': str(uuid.uuid4())}

    barrier = threading.Barrier(8)
    def identical(_):
        barrier.wait(timeout=15)
        return test.request('/api/leituras', (200, 201), 'POST', body, auth)[0]

    begin = len(test.report['requests'])
    with ThreadPoolExecutor(max_workers=8) as pool:
        duplicates = list(pool.map(identical, range(8)))
    statuses = [r['actualStatus'] for r in test.report['requests'][begin:]]
    test.check(statuses.count(201) == 1 and statuses.count(200) == 7, 'Oito reenvios simultaneos produzem uma criacao e sete repeticoes')
    test.check(all(r == duplicates[0] for r in duplicates) and duplicates[0]['temperaturaC'] == 0 and duplicates[0]['portaAberta'] is False, 'Reenvios preservam ID, UUID, recebimento, zero e porta fechada')

    measurements = [{**body, 'medicaoId': str(uuid.uuid4()), 'temperaturaC': n / 4} for n in range(16)]
    batch = [row for row in measurements for _ in range(4)]
    with ThreadPoolExecutor(max_workers=8) as pool:
        responses = list(pool.map(lambda row: test.request('/api/leituras', (200, 201), 'POST', row, auth)[0], batch))
    test.check(all(len({r['id'] for r in responses if r['medicaoId'] == m['medicaoId']}) == 1 for m in measurements), 'Sessenta e quatro envios concorrentes mantem um ID por cada uma das16 medicoes')
    with sqlite3.connect(test.database.as_uri() + '?mode=ro', uri=True) as con:
        count = con.execute('SELECT COUNT(*) FROM Leituras WHERE DispositivoId=?', (device_id,)).fetchone()[0]
    test.check(count == 17, 'SQLite contem exatamente17 medicoes autenticadas apos72 envios')

    conflict_id = str(uuid.uuid4())
    conflict = [{**body, 'medicaoId': conflict_id, 'temperaturaC': value} for value in (4, 5)]
    barrier = threading.Barrier(2)
    def incompatible(row):
        barrier.wait(timeout=15)
        return test.request('/api/leituras', (201, 409), 'POST', row, auth)[0]

    begin = len(test.report['requests'])
    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(incompatible, conflict))
    test.check(sorted(r['actualStatus'] for r in test.report['requests'][begin:]) == [201, 409], 'Conteudos diferentes com mesmo UUID concorrente criam uma linha e retornam conflito')

    seed_time = dt.datetime.now(dt.timezone.utc) - dt.timedelta(seconds=600)
    initial = []
    for n in range(100):
        row, _ = test.request('/api/leituras', 201, 'POST', {'geladeiraId': fridge_id, 'temperaturaC': 3 + n % 3, 'portaAberta': False, 'origem': 'Simulacao', 'medidoEmUtc': stamp(seed_time + dt.timedelta(seconds=n))})
        initial.append(row['id'])
    cutoff = stamp(dt.datetime.now(dt.timezone.utc) - dt.timedelta(seconds=1))
    query = f'/api/leituras?geladeiraId={fridge_id}&origem=Simulacao&pagina=3&tamanhoPagina=37'
    def during_write(n):
        if n % 3:
            return test.request('/api/leituras', 201, 'POST', {'geladeiraId': fridge_id, 'temperaturaC': 4, 'portaAberta': False, 'origem': 'Simulacao', 'medidoEmUtc': stamp()})[0]
        page, _ = test.request(query)
        expected = min(37, max(page['totalItens'] - 74, 0))
        items = page['itens']
        test.check(len(items) == expected and page['totalPaginas'] == (page['totalItens'] + 36) // 37, 'Contagem e terceira pagina compartilham a mesma visao durante insercoes')
        test.check(len({r['id'] for r in items}) == len(items) and all(r['origem'] == 'Simulacao' and r['geladeiraId'] == fridge_id for r in items), 'Historico concorrente nao mistura origens/equipamentos nem repete ID na pagina')
        return page

    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(during_write, range(60)))
    frozen = []
    for page_number in range(1, 4):
        page, _ = test.request(f'/api/leituras?geladeiraId={fridge_id}&origem=Simulacao&fimUtc={cutoff}&pagina={page_number}&tamanhoPagina=37')
        test.check(page['totalItens'] == 100 and page['totalPaginas'] == 3, 'Corte UTC fixo preserva o tamanho da coorte apesar das novas insercoes')
        frozen.extend(r['id'] for r in page['itens'])
    test.check(frozen == list(reversed(initial)), 'Paginacao com corte fixo recupera as100 leituras iniciais, sem omissao ou duplicacao')

    barrier = threading.Barrier(5)
    def revoke_race(n):
        barrier.wait(timeout=15)
        if n == 0:
            return test.request(route + f'/{device_id}/revogar', 200, 'POST')[0]
        return test.request('/api/leituras', (201, 401), 'POST', {**body, 'medicaoId': str(uuid.uuid4())}, auth)[0]

    begin = len(test.report['requests'])
    with ThreadPoolExecutor(max_workers=5) as pool:
        list(pool.map(revoke_race, range(5)))
    accepted = sum(r['method'] == 'POST' and r['path'] == '/api/leituras' and r['actualStatus'] == 201 for r in test.report['requests'][begin:])
    for _ in range(3):
        test.request('/api/leituras', 401, 'POST', {**body, 'medicaoId': str(uuid.uuid4())}, auth)
    with sqlite3.connect(test.database.as_uri() + '?mode=ro', uri=True) as con:
        count = con.execute('SELECT COUNT(*) FROM Leituras WHERE DispositivoId=?', (device_id,)).fetchone()[0]
    test.check(count == 18 + accepted, 'Corrida com revogacao persiste somente envios aceitos e bloqueia todos os posteriores')
    replacement, _ = test.request(route, 201, 'POST', {'nome': 'CREDENCIAL DE SOFTWARE SUBSTITUTA'})
    new_auth = {'Authorization': 'Bearer ' + replacement['credencial']}
    last_body = {**body, 'medicaoId': str(uuid.uuid4()), 'medidoEmUtc': stamp(), 'temperaturaC': 4}
    last, _ = test.request('/api/leituras', 201, 'POST', last_body, new_auth)
    before = test.inspect()
    test.stop()
    test.start('reinicio')
    repeated, _ = test.request('/api/leituras', 200, 'POST', last_body, new_auth)
    after = test.inspect()
    test.check(before == after and last == repeated, 'Reinicio conserva todas as linhas, credenciais e idempotencia depois da concorrencia')
    test.report['scenarioSummary'] = {'maxConcurrentClients': 8, 'duplicateRequests': 72, 'distinctAuthenticatedReadingsBeforeConflict': 17, 'simulationCohort': 100, 'simulationWritesWhileQuerying': 40, 'historyQueriesWhileWriting': 20, 'revocationRaceAccepted': accepted, 'fixedCutoffCohortPreserved': True}
except Exception as caught:
    error = caught
finally:
    test.finish(error)
if error:
    raise error
