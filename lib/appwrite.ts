import { Client, Databases } from 'appwrite';

const client = new Client();

client
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

export const databases = new Databases(client);

export const APPWRITE_CONFIG = {
    endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    collectionId: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID!,
    ventasCollectionId: process.env.NEXT_PUBLIC_APPWRITE_VENTAS_COLLECTION_ID!,
    detallesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_DETALLES_COLLECTION_ID!,
};