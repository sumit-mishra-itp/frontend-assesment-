import type { Product } from '../types';
import { saveCachedProducts, loadCachedProducts } from './storage';
import { normalizePrice } from '../utils/hash';

interface RawProduct {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating?: {
    rate?: number;
    count?: number;
  };
}

export const DEFAULT_PRODUCT_TARGET = 800;

const PRODUCTS_ENDPOINT = 'https://fakestoreapi.com/products';

const normalizeProducts = (rawProducts: RawProduct[]): Product[] => {
  return rawProducts.map((product) => ({
    id: product.id,
    sourceId: product.id,
    title: product.title,
    price: normalizePrice(product.price),
    description: product.description,
    category: product.category,
    image: product.image,
    rating: {
      rate: product.rating?.rate ?? 0,
      count: product.rating?.count ?? 0,
    },
  }));
};

const replicateProducts = (baseProducts: Product[], targetCount: number): Product[] => {
  return Array.from({ length: targetCount }, (_, index) => {
    const template = baseProducts[index % baseProducts.length];
    const loopIndex = Math.floor(index / baseProducts.length);
    const variance = 1 + (loopIndex % 5) * 0.01;

    return {
      ...template,
      id: index + 1,
      sourceId: template.sourceId,
      title: `${template.title} | Batch ${loopIndex + 1}`,
      price: normalizePrice(template.price * variance),
      rating: {
        rate: normalizePrice(template.rating.rate),
        count: template.rating.count + loopIndex,
      },
    };
  });
};

const restoreFromCache = (targetCount: number): Product[] => {
  const cachedProducts = loadCachedProducts();

  if (cachedProducts.length === 0) {
    return [];
  }

  if (cachedProducts.length >= targetCount) {
    return cachedProducts.slice(0, targetCount);
  }

  return replicateProducts(cachedProducts, targetCount);
};

export const getReplicatedProducts = async (
  targetCount = DEFAULT_PRODUCT_TARGET,
): Promise<{ products: Product[]; source: 'network' | 'cache' }> => {
  try {
    const response = await fetch(PRODUCTS_ENDPOINT);

    if (!response.ok) {
      throw new Error(`Products request failed with status ${response.status}`);
    }

    const rawProducts = (await response.json()) as RawProduct[];

    if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
      throw new Error('Products payload was empty');
    }

    const normalizedProducts = normalizeProducts(rawProducts);
    const replicatedProducts = replicateProducts(normalizedProducts, targetCount);
    saveCachedProducts(replicatedProducts);

    return {
      products: replicatedProducts,
      source: 'network',
    };
  } catch (error) {
    const cachedProducts = restoreFromCache(targetCount);

    if (cachedProducts.length > 0) {
      return {
        products: cachedProducts,
        source: 'cache',
      };
    }

    throw error;
  }
};
