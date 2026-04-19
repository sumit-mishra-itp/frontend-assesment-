import { useQuery } from '@tanstack/react-query';
import {
  DEFAULT_PRODUCT_TARGET,
  getReplicatedProducts,
} from '../services/products';

export const useProductsQuery = () => {
  return useQuery({
    queryKey: ['products', DEFAULT_PRODUCT_TARGET],
    queryFn: () => getReplicatedProducts(DEFAULT_PRODUCT_TARGET),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 20,
  });
};
