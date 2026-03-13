import Link from 'next/link'

import { useAuth } from '../../components/AuthContext';

export default function SidebarGestor() {
  const { role } = useAuth();
  return (
    <aside className='sidebar'>
      <h2>Gestor Mindiocar</h2>
      <nav>
        <Link href='/gestor'>Panel</Link>
        <Link href='/gestor/tareas'>Tareas</Link>
        <Link href='/gestor/ordenes'>Órdenes</Link>
        {role !== 'tecnico' && <Link href='/gestor/clientes'>Clientes</Link>}
        {role !== 'tecnico' && <Link href='/gestor/empleados'>Empleados</Link>}
      </nav>
    </aside>
  )
}


