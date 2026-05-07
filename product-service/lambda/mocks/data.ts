import { AvailableProduct, Product } from "../models/Product";

export const products: Product[] = [
  {
    description: "The best open Sennheiser headphones",
    id: "10",
    price: 1800,
    title: "Sennheiser HD800",
  },
  {
    description: "The best closed Sennheiser headphones",
    id: "11",
    price: 2000,
    title: "Sennheiser HD820",
  },
  {
    description: "The best wireless Sennheiser headphones",
    id: "12",
    price: 200,
    title: "Sennheiser Momentum 3",
  },
  {
    description: "Simple AirPods Generation 2",
    id: "13",
    price: 150,
    title: "Apple AirPods",
  },
  {
    description: "The Best Apple headphones",
    id: "14",
    price: 200,
    title: "Apple AirPods Pro",
  },
  {
    description: "Sennheiser HD600 the best headphones",
    id: "15",
    price: 300,
    title: "Sennheiser HD600",
  },
];

export const availableProducts: AvailableProduct[] = products.map(
  (product, index) => ({ ...product, count: index + 1 })
);