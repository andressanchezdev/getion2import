// useScreensaverSettings · imagen del protector de pantalla: carga la guardada, optimiza una nueva elegida y la guarda o restaura la original
// conecta con: ScreensaverTab; despacha settings.thunks, valida con settings.helpers y optimiza con global/helpers/images/imageOptimizer
// ojo: la imagen se reduce en el navegador (1200 px, WebP al 82 %) antes de enviarla; nada se guarda hasta pulsar «guardar»
import { useEffect, useState } from 'react'
import defaultLogo from '@/assets/images/screensaver-logo.jpg'
import { formatBytes, optimizeImageFile } from '@/global/helpers/images/imageOptimizer'
import { notify } from '@/global/helpers/feedback/toast'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { validateScreensaverFile } from '../helpers/settings.helpers'
import { selectSettings } from '../selectors/settings.selectors'
import { loadScreensaverThunk, saveScreensaverThunk } from '../thunks/settings.thunks'

export const useScreensaverSettings = () => {
  const dispatch = useAppDispatch()
  const { screensaverImage, screensaverLoading, screensaverSaving } = useAppSelector(selectSettings)
  const [newImage, setNewImage] = useState('')
  const [fileName, setFileName] = useState('')
  const [info, setInfo] = useState('')
  const [optimizing, setOptimizing] = useState(false)

  useEffect(() => {
    dispatch(loadScreensaverThunk())
  }, [dispatch])

  const clearNew = () => {
    setNewImage('')
    setFileName('')
    setInfo('')
  }

  const pickFile = async (file: File) => {
    const problem = validateScreensaverFile(file)
    if (problem) return notify.error(problem)
    setFileName(file.name)
    setOptimizing(true)
    try {
      const opt = await optimizeImageFile(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.82, mimeType: 'image/webp' })
      setNewImage(opt.dataUrl)
      setInfo(opt.compressionPercent > 0 ? `Optimizada: de ${formatBytes(opt.originalSizeBytes)} a ${opt.formattedSize} (-${opt.compressionPercent}%)` : `Tamaño: ${opt.formattedSize}`)
    } catch {
      notify.error('Error al optimizar la imagen')
    } finally {
      setOptimizing(false)
    }
  }

  const save = async () => {
    if (!newImage) return notify.error('Selecciona o sube una imagen válida')
    const result = await dispatch(saveScreensaverThunk(newImage))
    if (saveScreensaverThunk.fulfilled.match(result)) clearNew()
  }

  const restoreDefault = async () => {
    const result = await dispatch(saveScreensaverThunk(defaultLogo))
    if (saveScreensaverThunk.fulfilled.match(result)) clearNew()
  }

  return {
    currentImage: screensaverImage, loading: screensaverLoading, saving: screensaverSaving,
    newImage, fileName, info, optimizing, pickFile, save, restoreDefault,
  }
}
