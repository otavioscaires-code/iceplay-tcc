"""Gera copias Markdown privadas das minutas; nao cria DOCX ou aprova o TCC."""
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import shutil
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
    assets = []
    private_names = {"monografia.md": "TCC_ICEPLAY.md", "artigo.md": "ARTIGO_ICEPLAY.md", "referencias.md": "referencias.md"}
    for name, target in (("monografia.md", "TCC_ICEPLAY.md"), ("artigo.md", "ARTIGO_ICEPLAY.md"), ("referencias.md", "referencias.md")):
        source = root / "docs/tcc" / name
        text = source.read_text(encoding="utf-8")
        for key, value in mapping.items():
            text = text.replace("{{" + key + "}}", value)
        if "{{" in text or "}}" in text:
            raise ValueError("Marcador de autoria nao preenchido; preserve as fontes.")
        def copy_figure(match):
            original = (source.parent / match.group(2)).resolve()
            # Somente figuras publicas da documentacao podem entrar na copia privada.
            original.relative_to(root / "docs")
            data = original.read_bytes()
            digest = hashlib.sha256(data).hexdigest()
            asset = folder / "figuras" / (digest[:10] + "-" + original.name)
            asset.parent.mkdir(exist_ok=True)
            if not asset.exists():
                shutil.copyfile(original, asset)
                assets.append({"source": original.relative_to(root).as_posix(), "path": str(asset), "sha256": digest})
            if hashlib.sha256(asset.read_bytes()).hexdigest() != digest:
                raise ValueError("Figura copiada diverge da fonte.")
            return "![" + match.group(1) + "](" + asset.relative_to(folder).as_posix() + ")"
        text = re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", copy_figure, text)
        def local_link(match):
            label, destination = match.groups()
            if destination.startswith(("http://", "https://", "#")):
                return match.group(0)
            local, separator, anchor = destination.partition("#")
            original = (source.parent / local).resolve()
            if not original.is_file():
                raise ValueError("Referencia local ausente: " + destination)
            if original.parent == source.parent and original.name in private_names:
                resolved = private_names[original.name]
            else:
                resolved = original.as_posix()
            return "[" + label + "](" + resolved + (separator + anchor if separator else "") + ")"
        text = re.sub(r"(?<!!)\[([^\]]+)\]\(([^)]+)\)", local_link, text)
        path = folder / target
        path.write_text(text, encoding="utf-8")
        outputs.append({"path": str(path), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
    result = {"result": "passed", "scope": "Minutas textuais privadas com figuras; revisao academica, Word e resultados fisicos pendentes", "outputs": outputs, "assets": assets}
    (folder / "manifesto.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
