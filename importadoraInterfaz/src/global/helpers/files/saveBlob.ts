// saveBlob · guarda en el equipo del usuario un archivo que llegó del backend (por ejemplo, el Excel de una orden de compra)
// conecta con: los thunks que descargan archivos; usa el navegador (un enlace temporal), así que no corre en el servidor ni en pruebas sin DOM
// ojo: el enlace temporal se libera enseguida para no dejar el archivo en memoria
export const saveBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// el nombre del archivo que manda el backend en Content-Disposition (attachment; filename="x.xlsx"), o el de respaldo
export const filenameFromDisposition = (header: string | undefined, fallback: string): string => {
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header ?? '')
  return match ? decodeURIComponent(match[1]) : fallback
}
