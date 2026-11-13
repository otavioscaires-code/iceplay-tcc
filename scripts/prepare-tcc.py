"""Gera copias Markdown privadas das minutas; nao cria DOCX ou aprova o TCC."""
import datetime as dt
import hashlib
import json
from pathlib import Path
import uuid


def main():
    root = Path(__file__).resolve().parents[1]
    private = root / ".tools/documentacao-iceplay"
    metadata = json.loads((private / "autor.json").read_text(encoding="utf-8"))
    mapping = {"AUTOR": metadata["autor"], "RA_PRIVADO": metadata["ra"], "ORIENTADOR": metadata["orientador"],
               "CAMPUS": metadata["campus"], "ANO": str(metadata["ano"])}
    folder = private / ("minuta-" + dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:6])
    folder.mkdir(parents=True, exist_ok=False)
    outputs = []
    for name, target in (("monografia.md", "TCC_ICEPLAY.md"), ("artigo.md", "ARTIGO_ICEPLAY.md"), ("referencias.md", "referencias.md")):
        text = (root / "docs/tcc" / name).read_text(encoding="utf-8")
        for key, value in mapping.items():
            text = text.replace("{{" + key + "}}", value)
        if "{{" in text or "}}" in text:
            raise ValueError("Marcador de autoria nao preenchido; preserve as fontes.")
        path = folder / target
        path.write_text(text, encoding="utf-8")
        outputs.append({"path": str(path), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
    result = {"result": "passed", "scope": "Minutas textuais privadas; revisao academica, Word e resultados fisicos pendentes", "outputs": outputs}
    (folder / "manifesto.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
