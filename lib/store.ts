import { create } from 'zustand';
import { persist } from 'zustand/middleware'; // 1. Importamos el middleware de persistencia

// El molde del Producto
export interface Producto {
    $id: string;
    nombre: string;
    codigoBarras: string;
    precio: number;
    stock: number;
}

// El molde del Item en el Carrito
export interface ItemCarrito {
    producto: Producto;
    cantidad: number;
}

// El plano de la tienda
interface CartState {
    carrito: ItemCarrito[];
    agregarProducto: (producto: Producto) => void;
    eliminarProducto: (productoId: string) => void;
    limpiarCarrito: () => void;
}

// 2. Envolvemos toda nuestra lógica dentro de la función `persist`
export const useCartStore = create<CartState>()(
    persist(
        (set) => ({
            carrito: [],

            agregarProducto: (producto) =>
                set((state) => {
                    const itemExiste = state.carrito.find((item) => item.producto.$id === producto.$id);

                    if (itemExiste) {
                        if (itemExiste.cantidad >= producto.stock) {
                            alert('¡No puedes agregar más unidades! Has alcanzado el límite de stock.');
                            return { carrito: state.carrito };
                        }

                        return {
                            carrito: state.carrito.map((item) =>
                                item.producto.$id === producto.$id
                                    ? { ...item, cantidad: item.cantidad + 1 }
                                    : item
                            ),
                        };
                    }

                    if (producto.stock > 0) {
                        return { carrito: [...state.carrito, { producto, cantidad: 1 }] };
                    } else {
                        alert('Este producto no tiene stock disponible.');
                        return { carrito: state.carrito };
                    }
                }),

            eliminarProducto: (productoId) =>
                set((state) => ({
                    carrito: state.carrito.filter((item) => item.producto.$id !== productoId),
                })),

            limpiarCarrito: () => set({ carrito: [] }),
        }),
        {
            name: 'pos-carrito-storage', // 3. Este es el nombre de la "llave" que se creará en el LocalStorage
        }
    )
);