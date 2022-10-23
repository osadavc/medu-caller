import medusa from "../lib/medusa";
import prisma from "../lib/prisma";
import { Caller } from "@prisma/client";

const addToCart = async (
  userDetails: Caller | null,
  response: any,
  from: any
) => {
  const {
    products: { [0]: product },
  } = await medusa.products.list({
    q: userDetails?.productName?.replace(/[^a-zA-Z0-9 ]/g, ""),
  });

  response.say(`You selected ${product.title}. We will place your order now`);
  const {
    regions: {
      [0]: {
        id: regionId,
        countries: {
          [0]: { iso_2 },
        },
      },
    },
  } = await medusa.regions.list();

  const {
    cart: { id: cartId },
  } = await medusa.carts.create({
    items: [
      {
        variant_id: product.variants[0].id,
        quantity: 1,
      },
    ],
    country_code: iso_2,
    region_id: regionId,
  });

  const shippingOptions = await medusa.shippingOptions.list();

  const address = {
    first_name: "Medusa",
    last_name: "Caller",
    address_1: userDetails?.shippingAddress!,
    address_2: "",
    city: "",
    company: "",
    country_code: iso_2,
    phone: from,
    postal_code: "",
    province: "",
  };

  await medusa.carts.update(cartId, {
    billing_address: address,
    email: userDetails?.emailAddress!,
    shipping_address: address,
  });

  ("address updated");

  await medusa.carts.addShippingMethod(cartId, {
    option_id: shippingOptions.shipping_options[0].id,
    data: {
      address: userDetails?.shippingAddress ?? "",
      phoneNumber: from,
    },
  });

  ("shipping method added");

  await prisma.caller.update({
    where: {
      phoneNumber: from,
    },
    data: {
      latestCartId: cartId,
      productName: null,
    },
  });

  ("caller updated");

  return;
};

export default addToCart;
