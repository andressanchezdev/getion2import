// ReturnChoiceCards · grupo de tarjetas con radio para elegir una opción (se usa para la causal y para la resolución de la devolución)
// conecta con: CreateReturnDrawer; las opciones y el valor vienen de useCreateReturnForm

export interface ChoiceOption<T extends string> {
  value: T
  title: string
  description: string
}

interface Props<T extends string> {
  name: string
  value: T
  options: ChoiceOption<T>[]
  onChange: (value: T) => void
}

export const ReturnChoiceCards = <T extends string>({ name, value, options, onChange }: Props<T>) => (
  <div className="cr-resolution-grid">
    {options.map((opt) => (
      <label key={opt.value} className={`cr-res-card ${value === opt.value ? 'is-active' : ''}`}>
        <input type="radio" name={name} checked={value === opt.value} onChange={() => onChange(opt.value)} />
        <div>
          <strong>{opt.title}</strong>
          <p>{opt.description}</p>
        </div>
      </label>
    ))}
  </div>
)
