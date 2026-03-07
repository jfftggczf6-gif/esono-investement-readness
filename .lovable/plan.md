

## Probleme

Le fichier ODD Excel (.xlsm) est corrompu car JSZip **re-compresse le `vbaProject.bin`** (macros VBA) avec DEFLATE, ce qui casse la signature binaire des macros. Excel refuse alors d'ouvrir le fichier.

C'est le même problème classique des fichiers `.xlsm` : les parties VBA ne doivent pas être re-compressées.

## Solution

Modifier `odd-excel-template.ts` pour **préserver les fichiers VBA en mode STORE** (sans compression) lors de la regénération du ZIP :

1. Avant `zip.generateAsync`, itérer sur les fichiers du ZIP et forcer `compression: "STORE"` sur `xl/vbaProject.bin` et tout fichier dans `xl/vba*`
2. Utiliser l'option `compressionOptions` par fichier de JSZip, ou reconstruire le ZIP en copiant les fichiers VBA sans compression

Concrètement dans `_shared/odd-excel-template.ts` :

```typescript
// Before generating, mark VBA files as STORE (no compression)
zip.forEach((relativePath, file) => {
  if (relativePath.includes("vbaProject") || relativePath.includes("vba")) {
    file.options.compression = "STORE";
  }
});

return await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
```

Alternativement, si JSZip ne supporte pas le changement d'options par fichier après chargement, on peut **relire les bytes bruts du vbaProject.bin** avant modification et les réinjecter avec `compression: "STORE"` explicite :

```typescript
// Preserve VBA binary before any modifications
const vbaFile = zip.file("xl/vbaProject.bin");
const vbaBytes = vbaFile ? await vbaFile.async("uint8array") : null;

// ... all sheet modifications ...

// Re-inject VBA without compression
if (vbaBytes) {
  zip.file("xl/vbaProject.bin", vbaBytes, { compression: "STORE" });
}

return await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
```

Cela garantit que les macros VBA restent intactes et qu'Excel peut ouvrir le fichier normalement.

