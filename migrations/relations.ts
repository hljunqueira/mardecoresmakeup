import { relations } from "drizzle-orm/relations";
import { customers, customerAddresses, products, productImages, orders, orderItems, coupons, couponUsage, creditAccounts, creditPayments, productReviews, shoppingCart } from "./schema";

export const customerAddressesRelations = relations(customerAddresses, ({one, many}) => ({
	customer: one(customers, {
		fields: [customerAddresses.customerId],
		references: [customers.id]
	}),
	orders: many(orders),
}));

export const customersRelations = relations(customers, ({many}) => ({
	customerAddresses: many(customerAddresses),
	couponUsages: many(couponUsage),
	orders: many(orders),
	creditAccounts: many(creditAccounts),
	productReviews: many(productReviews),
	shoppingCarts: many(shoppingCart),
}));

export const productImagesRelations = relations(productImages, ({one}) => ({
	product: one(products, {
		fields: [productImages.productId],
		references: [products.id]
	}),
}));

export const productsRelations = relations(products, ({many}) => ({
	productImages: many(productImages),
	orderItems: many(orderItems),
	productReviews: many(productReviews),
	shoppingCarts: many(shoppingCart),
}));

export const orderItemsRelations = relations(orderItems, ({one}) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
	product: one(products, {
		fields: [orderItems.productId],
		references: [products.id]
	}),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	orderItems: many(orderItems),
	couponUsages: many(couponUsage),
	coupon: one(coupons, {
		fields: [orders.couponId],
		references: [coupons.id]
	}),
	customer: one(customers, {
		fields: [orders.customerId],
		references: [customers.id]
	}),
	customerAddress: one(customerAddresses, {
		fields: [orders.shippingAddressId],
		references: [customerAddresses.id]
	}),
	productReviews: many(productReviews),
}));

export const couponUsageRelations = relations(couponUsage, ({one}) => ({
	coupon: one(coupons, {
		fields: [couponUsage.couponId],
		references: [coupons.id]
	}),
	customer: one(customers, {
		fields: [couponUsage.customerId],
		references: [customers.id]
	}),
	order: one(orders, {
		fields: [couponUsage.orderId],
		references: [orders.id]
	}),
}));

export const couponsRelations = relations(coupons, ({many}) => ({
	couponUsages: many(couponUsage),
	orders: many(orders),
}));

export const creditPaymentsRelations = relations(creditPayments, ({one}) => ({
	creditAccount: one(creditAccounts, {
		fields: [creditPayments.creditAccountId],
		references: [creditAccounts.id]
	}),
}));

export const creditAccountsRelations = relations(creditAccounts, ({one, many}) => ({
	creditPayments: many(creditPayments),
	customer: one(customers, {
		fields: [creditAccounts.customerId],
		references: [customers.id]
	}),
}));

export const productReviewsRelations = relations(productReviews, ({one}) => ({
	customer: one(customers, {
		fields: [productReviews.customerId],
		references: [customers.id]
	}),
	order: one(orders, {
		fields: [productReviews.orderId],
		references: [orders.id]
	}),
	product: one(products, {
		fields: [productReviews.productId],
		references: [products.id]
	}),
}));

export const shoppingCartRelations = relations(shoppingCart, ({one}) => ({
	customer: one(customers, {
		fields: [shoppingCart.customerId],
		references: [customers.id]
	}),
	product: one(products, {
		fields: [shoppingCart.productId],
		references: [products.id]
	}),
}));