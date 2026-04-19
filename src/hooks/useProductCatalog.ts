import { useEffect, useMemo, useRef } from 'react';
import { logStructuredEvent } from '../services/observability';
import type { NotificationLevel } from '../types';
import type { SortMode } from '../store/useCheckoutUiStore';
import { useProductsQuery } from './useProductsQuery';

interface NotificationInput {
  message: string;
  level: NotificationLevel;
  source: string;
}

type EnqueueNotification = (input: NotificationInput) => boolean;

interface UseProductCatalogArgs {
  searchQuery: string;
  selectedCategory: string;
  sortMode: SortMode;
  enqueueNotification: EnqueueNotification;
}

export const useProductCatalog = ({
  searchQuery,
  selectedCategory,
  sortMode,
  enqueueNotification,
}: UseProductCatalogArgs) => {
  const productsQuery = useProductsQuery();
  const lastProductsLoadSignature = useRef<string>('');
  const lastProductsErrorMessage = useRef<string>('');

  const productsData = productsQuery.data;
  const products = useMemo(() => productsData?.products ?? [], [productsData]);
  const productsSource = productsData?.source ?? 'pending';
  const loadingProducts = productsQuery.isLoading;

  useEffect(() => {
    if (!productsQuery.data) {
      return;
    }

    const signature = `${productsQuery.data.source}:${productsQuery.data.products.length}`;

    if (lastProductsLoadSignature.current === signature) {
      return;
    }

    lastProductsLoadSignature.current = signature;
    logStructuredEvent('system', 'products_loaded', {
      source: productsQuery.data.source,
      count: productsQuery.data.products.length,
    });
  }, [productsQuery.data]);

  useEffect(() => {
    if (!productsQuery.isError) {
      return;
    }

    const message =
      productsQuery.error instanceof Error
        ? productsQuery.error.message
        : 'Unknown product loading failure';

    if (lastProductsErrorMessage.current === message) {
      return;
    }

    lastProductsErrorMessage.current = message;
    enqueueNotification({
      level: 'error',
      source: 'products',
      message: 'Unable to load products from API or cache.',
    });
    logStructuredEvent('system', 'products_load_failed', {
      message,
    });
  }, [enqueueNotification, productsQuery.error, productsQuery.isError]);

  const categories = useMemo(() => {
    return [
      'all',
      ...Array.from(new Set(products.map((product) => product.category))).sort((a, b) =>
        a.localeCompare(b),
      ),
    ];
  }, [products]);

  const productPriceById = useMemo(() => {
    return new Map(products.map((product) => [product.id, product.price]));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const scopedProducts = products.filter((product) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        product.title.toLowerCase().includes(normalizedSearch) ||
        product.category.toLowerCase().includes(normalizedSearch);

      const matchesCategory =
        selectedCategory === 'all' || product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    if (sortMode === 'relevance') {
      return scopedProducts;
    }

    const sortedProducts = [...scopedProducts];

    if (sortMode === 'price-asc') {
      sortedProducts.sort((first, second) => first.price - second.price);
      return sortedProducts;
    }

    if (sortMode === 'price-desc') {
      sortedProducts.sort((first, second) => second.price - first.price);
      return sortedProducts;
    }

    sortedProducts.sort((first, second) => first.title.localeCompare(second.title));
    return sortedProducts;
  }, [products, searchQuery, selectedCategory, sortMode]);

  return {
    products,
    productsSource,
    loadingProducts,
    categories,
    productPriceById,
    filteredProducts,
  };
};
