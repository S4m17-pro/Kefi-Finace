'use client';

import { useEffect, useState } from 'react';
import { databases, APPWRITE_CONFIG } from '@/lib/appwrite';
import { ID } from 'appwrite';

// Usamos la misma estructura (molde) que definimos para Zustand
interface Producto {
    $id: string;
    nombre: string;
    codigoBarras: string;
    precio: number;
    stock: number;
}

export default function InventarioPage() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);

    // Estados para los campos del formulario
    const [nombre, setNombre] = useState('');
    const [codigoBarras, setCodigoBarras] = useState('');
    const [precio, setPrecio] = useState('');
    const [stock, setStock] = useState('');

    // Función para traer los productos desde Appwrite Cloud
    async function cargarProductos() {
        try {
            setLoading(true);
            const respuesta = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collectionId
            );
            // Appwrite devuelve los registros dentro de .documents
            setProductos(respuesta.documents as unknown as Producto[]);
        } catch (error) {
            console.error('Error al cargar productos:', error);
        } finally {
            setLoading(false);
        }
    }

    // Se ejecuta una sola vez al abrir la página
    useEffect(() => {
        cargarProductos();
    }, []);

    // Función para guardar un nuevo producto
    async function handleGuardarProducto(e: React.FormEvent) {
        e.preventDefault();

        if (!nombre || !codigoBarras || !precio || !stock) {
            alert('Por favor, llena todos los campos.');
            return;
        }

        try {
            // Mandamos los datos a Appwrite Cloud
            await databases.createDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collectionId,
                ID.unique(), // Le decimos a Appwrite que le genere un ID único automático a este registro
                {
                    nombre,
                    codigoBarras,
                    precio: parseFloat(precio), // Convertimos el texto a número decimal
                    stock: parseInt(stock),      // Convertimos el texto a número entero
                }
            );

            // Limpiamos los campos del formulario
            setNombre('');
            setCodigoBarras('');
            setPrecio('');
            setStock('');

            alert('¡Producto guardado con éxito!');

            // Recargamos la lista para ver el nuevo producto reflejado abajo
            cargarProductos();
        } catch (error: any) {
            console.error('Error al guardar:', error);
            alert('Hubo un error al guardar el producto: ' + error.message);
        }
    }

    return (
        <main className="flex min-h-screen flex-col lg:flex-row gap-8 p-8 bg-slate-900 text-white">

            {/* SECCIÓN 1: FORMULARIO (Izquierda) */}
            <div className="w-full lg:w-1/3 bg-slate-800 p-6 rounded-xl border border-slate-700 h-fit">
                <h2 className="text-2xl font-bold mb-4 text-emerald-400">Registrar Producto 📦</h2>

                <form onSubmit={handleGuardarProducto} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-300">Nombre del Producto</label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej. Perfume One Million 100ml"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-300">Código de Barras</label>
                        <input
                            type="text"
                            value={codigoBarras}
                            onChange={(e) => setCodigoBarras(e.target.value)}
                            placeholder="Ej. 770123456789"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-300">Precio</label>
                            <input
                                type="number"
                                value={precio}
                                onChange={(e) => setPrecio(e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-300">Stock</label>
                            <input
                                type="number"
                                value={stock}
                                onChange={(e) => setStock(e.target.value)}
                                placeholder="0"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg transition-colors mt-2"
                    >
                        Guardar en Base de Datos
                    </button>
                </form>
            </div>

            {/* SECCIÓN 2: TABLA DE INVENTARIO (Derecha) */}
            <div className="w-full lg:w-2/3 bg-slate-800 p-6 rounded-xl border border-slate-700">
                <h2 className="text-2xl font-bold mb-4 text-slate-200">Inventario Actual</h2>

                {loading ? (
                    <p className="text-yellow-400 animate-pulse">Cargando productos...</p>
                ) : productos.length === 0 ? (
                    <p className="text-slate-400">No hay productos registrados todavía.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-700 text-slate-400 text-sm">
                                    <th className="pb-3 font-semibold">Nombre</th>
                                    <th className="pb-3 font-semibold">Código</th>
                                    <th className="pb-3 font-semibold text-right">Precio</th>
                                    <th className="pb-3 font-semibold text-right">Stock</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {productos.map((prod) => (
                                    <tr key={prod.$id} className="text-slate-200 hover:bg-slate-750 transition-colors">
                                        <td className="py-3 font-medium">{prod.nombre}</td>
                                        <td className="py-3 text-sm text-slate-400">{prod.codigoBarras}</td>
                                        <td className="py-3 text-right">${prod.precio.toLocaleString()}</td>
                                        <td className="py-3 text-right">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${prod.stock > 5 ? 'bg-slate-900 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
                                                {prod.stock} uds
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </main>
    );
}