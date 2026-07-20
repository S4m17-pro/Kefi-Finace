'use client';
import { ID } from 'appwrite';
import { useEffect, useState } from 'react';
import { databases, APPWRITE_CONFIG } from '@/lib/appwrite';
import { useCartStore, Producto } from '@/lib/store';

export default function PosPage() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    // Traemos las variables y funciones que creamos en nuestra tienda de Zustand
    const { carrito, agregarProducto, eliminarProducto, limpiarCarrito } = useCartStore();

    // Cargamos los productos disponibles para poder listarlos o buscarlos
    async function cargarProductos() {
        try {
            setLoading(true);
            const respuesta = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collectionId
            );
            setProductos(respuesta.documents as unknown as Producto[]);
        } catch (error) {
            console.error('Error al cargar productos en el POS:', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        cargarProductos();
    }, []);

    // Este useEffect simula el comportamiento de la pistola lectora de forma global
    useEffect(() => {
        let codigoBuffer = '';
        let ultimoAcceso = Date.now();

        const handleKeyDownGlobal = (e: KeyboardEvent) => {
            const ahora = Date.now();

            // Si pasa mucho tiempo entre teclas (más de 50ms), asumimos que es un humano tecleando despacio
            // Las pistolas reales escriben todo en menos de 10-20ms.
            // Para probarlo tú mismo con tu teclado, puedes subir este límite a 1000ms (1 segundo) temporalmente.
            if (ahora - ultimoAcceso > 1000) {
                codigoBuffer = ''; // Reiniciamos el buffer si tardaste mucho
            }

            ultimoAcceso = ahora;

            // Si la tecla es 'Enter', procesamos el código acumulado
            if (e.key === 'Enter') {
                if (codigoBuffer.trim().length > 0) {
                    console.log('¡Código detectado por el escucha global!:', codigoBuffer);

                    // Buscamos el producto en la lista local
                    const encontrado = productos.find(
                        (p) => p.codigoBarras.toLowerCase() === codigoBuffer.trim().toLowerCase()
                    );

                    if (encontrado) {
                        agregarProducto(encontrado);
                    } else {
                        console.log('Producto no encontrado mediante escáner global.');
                    }

                    codigoBuffer = ''; // Limpiamos para el siguiente escaneo
                }
                return;
            }

            // Ignoramos teclas especiales como Shift, Control, etc.
            if (e.key.length === 1) {
                codigoBuffer += e.key;
            }
        };

        // Enganchamos el evento a la ventana entera del navegador
        window.addEventListener('keydown', handleKeyDownGlobal);

        // Limpiamos el evento cuando el usuario se vaya de la página (Buena práctica de React)
        return () => {
            window.removeEventListener('keydown', handleKeyDownGlobal);
        };
    }, [productos, agregarProducto]); // Se vuelve a activar si la lista de productos cambia
    // Simulación de escáner de código de barras
    function handleBuscarCodigo(e: React.FormEvent) {
        e.preventDefault();
        if (!busqueda) return;

        // Buscamos si algún producto del inventario coincide con lo que se escribió/escaneó
        const encontrado = productos.find(
            (p) => p.codigoBarras.toLowerCase() === busqueda.trim().toLowerCase()
        );

        if (encontrado) {
            agregarProducto(encontrado); // Zustand lo mete al carrito automáticamente manejando el stock
            setBusqueda(''); // Limpiamos el input del escáner
        } else {
            alert('Producto no encontrado con ese código de barras.');
        }
    }

    // Calculamos el total a pagar sumando el precio de cada item por su cantidad
    const totalPagar = carrito.reduce(
        (acumulado, item) => acumulado + item.producto.precio * item.cantidad,
        0
    );

    // Función para finalizar la venta y descontar stock de Appwrite Cloud
    async function handleFinalizarVenta() {
        if (carrito.length === 0) {
            alert('El carrito está vacío.');
            return;
        }

        try {
            // 1. Guardar el encabezado de la venta en la colección 'ventas'
            const facturaGenerada = await databases.createDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.ventasCollectionId,
                ID.unique(), // ID único para esta venta
                {
                    total: totalPagar,
                    fecha: new Date().toISOString(), // Fecha actual en formato estándar
                }
            );

            const ventaId = facturaGenerada.$id; // Guardamos el ID que generó Appwrite

            // 2. Recorrer el carrito para registrar los detalles y actualizar existencias
            for (const item of carrito) {

                // A. Guardamos el registro en 'detalles_ventas' amarrado al ventaId
                await databases.createDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.detallesCollectionId,
                    ID.unique(),
                    {
                        ventaId: ventaId,
                        productoId: item.producto.$id,
                        nombreProducto: item.producto.nombre,
                        cantidad: item.cantidad,
                        precioUnitario: item.producto.precio,
                    }
                );

                // B. Calculamos y actualizamos el residuo del stock del producto
                const nuevoStock = item.producto.stock - item.cantidad;
                await databases.updateDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.collectionId,
                    item.producto.$id,
                    {
                        stock: nuevoStock,
                    }
                );
            }

            alert('¡Venta e historial registrados con éxito en la nube!');
            limpiarCarrito(); // Vaciamos Zustand y LocalStorage
            cargarProductos(); // Recargamos el catálogo local
        } catch (error: any) {
            console.error('Error crítico al procesar la venta:', error);
            alert('Hubo un problema al procesar la transacción: ' + error.message);
        }
    }

    return (
        <main className="flex min-h-screen flex-col lg:flex-row gap-6 p-6 bg-slate-900 text-white">

            {/* SECCIÓN IZQUIERDA: BUSCADOR Y CATÁLOGO */}
            <div className="w-full lg:w-2/3 flex flex-col gap-6">

                {/* Lector de código de barras virtual */}
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <h2 className="text-lg font-semibold mb-2 text-slate-300">Lector de Código de Barras 🏷️</h2>
                    <form onSubmit={handleBuscarCodigo} className="flex gap-2">
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Escanea o escribe el código de barras aquí..."
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 font-mono text-lg tracking-wider"
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="bg-blue-650 hover:bg-blue-600 text-white font-bold px-6 rounded-lg transition-colors"
                        >
                            Enter
                        </button>
                    </form>
                </div>

                {/* Catálogo visual rápido para hacer clic */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex-1">
                    <h2 className="text-xl font-bold mb-4 text-slate-200">Productos Disponibles</h2>

                    {loading ? (
                        <p className="text-yellow-400 animate-pulse">Cargando catálogo...</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {productos.map((prod) => (
                                <button
                                    key={prod.$id}
                                    onClick={() => agregarProducto(prod)}
                                    disabled={prod.stock === 0}
                                    className="bg-slate-900 border border-slate-700 rounded-xl p-4 text-left hover:border-emerald-500 hover:bg-slate-850 transition-all flex flex-col justify-between h-36 disabled:opacity-50 disabled:hover:border-slate-700 disabled:hover:bg-slate-900"
                                >
                                    <div>
                                        <h3 className="font-semibold text-slate-200 line-clamp-2">{prod.nombre}</h3>
                                        <p className="text-xs font-mono text-slate-500 mt-1">{prod.codigoBarras}</p>
                                    </div>
                                    <div className="flex justify-between items-center mt-2 w-full">
                                        <span className="text-emerald-400 font-bold text-lg">${prod.precio.toLocaleString()}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${prod.stock > 5 ? 'bg-slate-800 text-slate-400' : 'bg-rose-950 text-rose-400'}`}>
                                            {prod.stock === 0 ? 'Sin stock' : `${prod.stock} uds`}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* SECCIÓN DERECHA: CARRITO DE COMPRAS (MANEJADO POR ZUSTAND) */}
            <div className="w-full lg:w-1/3 bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col justify-between min-h-[500px]">
                <div>
                    <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                        <h2 className="text-xl font-bold text-slate-200">Carrito de Ventas 🛒</h2>
                        <span className="bg-blue-950 text-blue-400 text-xs font-bold px-2.5 py-1 rounded-full">
                            {carrito.reduce((acc, item) => acc + item.cantidad, 0)} items
                        </span>
                    </div>

                    {carrito.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <p className="text-4xl mb-2">🛒</p>
                            <p className="text-sm">El carrito está vacío.</p>
                            <p className="text-xs mt-1 text-slate-600">Escanea un código o haz clic en un producto.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
                            {carrito.map((item) => (
                                <div key={item.producto.$id} className="bg-slate-900 border border-slate-750 rounded-lg p-3 flex justify-between items-center">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <h4 className="text-sm font-medium text-slate-250 truncate">{item.producto.nombre}</h4>
                                        <p className="text-xs text-emerald-500 mt-0.5">
                                            {item.cantidad} x ${item.producto.precio.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-slate-200">
                                            ${(item.producto.precio * item.cantidad).toLocaleString()}
                                        </span>
                                        <button
                                            onClick={() => eliminarProducto(item.producto.$id)}
                                            className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                                            title="Eliminar del carrito"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Resumen del total y botón de cobro */}
                <div className="border-t border-slate-700 pt-4 mt-4">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-400 font-medium">Total General:</span>
                        <span className="text-3xl font-black text-emerald-400">${totalPagar.toLocaleString()}</span>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={limpiarCarrito}
                            disabled={carrito.length === 0}
                            className="w-1/3 border border-slate-600 hover:bg-slate-750 text-slate-300 font-semibold py-3 px-2 rounded-xl transition-colors text-sm disabled:opacity-30"
                        >
                            Vaciar
                        </button>
                        <button
                            onClick={handleFinalizarVenta}
                            disabled={carrito.length === 0}
                            className="w-2/3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-colors text-base disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            💵 Cobrar Factura
                        </button>
                    </div>
                </div>

            </div>

        </main>
    );
}