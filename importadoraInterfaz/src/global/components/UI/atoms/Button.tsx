// Button · botón del ERP con las variantes de la maqueta: principal (azul), secundario (gris), peligro (rojo) y destacado (amarillo)
// conecta con: Button.css (estilos de las clases btn-*), App.tsx (carga el css para toda la app); lo usan las pantallas nuevas (ej. pedidos)
// ojo: las clases btn-primary, btn-secondary y btn-danger ya se usaban en clientes, empleados y traslados pero no estaban definidas en ningún css (esos botones salían sin estilo); ahora Button.css las define y los botones sueltos que ya las usan se ven igual que este componente
import React from 'react'
import './Button.css'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'accent'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export const Button: React.FC<ButtonProps> = ({ variant = 'secondary', type = 'button', className = '', ...rest }) => {
  return <button type={type} className={`btn-${variant} ${className}`.trim()} {...rest} />
}

export default Button
