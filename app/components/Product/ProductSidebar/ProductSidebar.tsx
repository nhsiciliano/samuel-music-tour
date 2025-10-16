'use client';
import { Accordion, Flowbite } from 'flowbite-react';
import { FC, useEffect, useMemo, useState } from 'react';
import { HiArrowDown } from 'react-icons/hi';
import { products } from '@wix/stores';
import { ProductOptions } from '@app/components/Product/ProductOptions/ProductOptions';
import type { SelectedOptions } from '@app/components/Product/ProductOptions/helpers';
import { ProductTag } from '@app/components/Product/ProductTag/ProductTag';
import { formatPrice } from '@app/utils/price-formatter';
import { useUI } from '@app/components/Provider/context';
import { useAddItemToCart } from '@app/hooks/useAddItemToCart';
import { Quantity } from '@app/components/Quantity/Quantity';
import testIds from '@app/utils/test-ids';
import { BackInStockFormModal } from '@app/components/BackInStockFormModal/BackInStockFormModal';
import { STORES_APP_ID } from '@app/constants';

interface ProductSidebarProps {
  product: products.Product;
  className?: string;
}

const createProductOptions = (
  selectedOptions?: SelectedOptions,
  selectedVariant?: products.Variant
) =>
  Object.keys(selectedOptions ?? {}).length
    ? {
        options: selectedVariant?._id
          ? { variantId: selectedVariant!._id }
          : { options: selectedOptions },
      }
    : undefined;

const getDefaultSelectedOptions = (
  product: products.Product
): SelectedOptions => {
  const defaults: SelectedOptions = {};
  product.productOptions?.forEach((option) => {
    const defaultChoice = option.choices?.[0]?.description ?? null;
    defaults[option.name!] = defaultChoice;
  });
  return defaults;
};

const getVariantForOptions = (
  product: products.Product,
  options: SelectedOptions
) => {
  if (!product.manageVariants) {
    return undefined;
  }
  return product.variants?.find((variant) =>
    Object.keys(variant.choices ?? {}).every(
      (choice) => options[choice] === variant.choices?.[choice]
    )
  );
};

export const ProductSidebar: FC<ProductSidebarProps> = ({ product }) => {
  const addItem = useAddItemToCart();
  const { openSidebar, openModalBackInStock } = useUI();
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);
  const defaultSelectedOptions = useMemo(
    () => getDefaultSelectedOptions(product),
    [product]
  );
  const defaultVariant = useMemo(
    () => getVariantForOptions(product, defaultSelectedOptions),
    [product, defaultSelectedOptions]
  );
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>(
    () => ({
      ...defaultSelectedOptions,
    })
  );
  const [selectedVariant, setSelectedVariant] = useState<
    products.Variant | undefined
  >(() => defaultVariant);

  const price = formatPrice({
    amount: selectedVariant?.variant?.priceData?.price || product.price!.price!,
    currencyCode: product.price!.currency!,
  });

  useEffect(() => {
    const variant = getVariantForOptions(product, selectedOptions);
    setSelectedVariant(variant);
    setQuantity(1);
  }, [selectedOptions, product]);

  useEffect(() => {
    setSelectedOptions({ ...defaultSelectedOptions });
    setSelectedVariant(defaultVariant);
    setQuantity(1);
  }, [product, defaultSelectedOptions, defaultVariant]);

  const isAvailableForPurchase = useMemo(() => {
    if (!product.manageVariants && product.stock?.inStock) {
      return true;
    }
    if (!product.manageVariants && !product.stock?.inStock) {
      return false;
    }

    return selectedVariant?.stock?.inStock;
  }, [selectedVariant, product]);

  const addToCart = async () => {
    setLoading(true);
    try {
      await addItem({
        quantity,
        catalogReference: {
          catalogItemId: product._id!,
          appId: STORES_APP_ID,
          ...createProductOptions(selectedOptions, selectedVariant),
        },
      });
      setLoading(false);
      openSidebar();
    } catch (err) {
      setLoading(false);
    }
  };

  const notifyWhenAvailable = async () => {
    openModalBackInStock();
  };

  const buyNowLink = useMemo(() => {
    const productOptions = createProductOptions(
      selectedOptions,
      selectedVariant
    );
    return `/api/quick-buy/${product._id}?quantity=${quantity}&productOptions=${
      productOptions ? JSON.stringify(productOptions.options) : ''
    }`;
  }, [selectedOptions, selectedVariant, product._id, quantity]);

  return (
    <>
      <ProductTag
        name={product.name!}
        price={price}
        sku={product.sku ?? undefined}
      />
      {product.productOptions?.length ? (
        <div className="mt-2">
          <ProductOptions
            options={product.productOptions}
            selectedOptions={selectedOptions}
            setSelectedOptions={setSelectedOptions}
          />
        </div>
      ) : null}
      <div className="mb-6">
        <span className="text-xs tracking-wide">Quantity</span>
        <div className="mt-2">
          <Quantity
            value={quantity}
            max={
              (selectedVariant?.stock?.trackQuantity
                ? selectedVariant?.stock?.quantity
                : product.stock?.quantity!) ?? 9999
            }
            handleChange={(e) => setQuantity(Number(e.target.value))}
            increase={() => setQuantity(1 + quantity)}
            decrease={() => setQuantity(quantity - 1)}
          />
        </div>
      </div>
      {isAvailableForPurchase ? (
        <div>
          <button
            data-testid={testIds.PRODUCT_DETAILS.ADD_TO_CART_CTA}
            aria-label="Add to Cart"
            className="btn-main w-full my-1 rounded-2xl"
            type="button"
            onClick={addToCart}
            disabled={loading}
          >
            Add to Cart
          </button>
          <div className="w-full pt-2">
            <a
              data-testid={testIds.PRODUCT_DETAILS.BUY_NOW_CTA}
              className="btn-main w-full my-1 rounded-2xl block text-center"
              href={buyNowLink}
            >
              Buy Now
            </a>
          </div>
        </div>
      ) : null}
      {!isAvailableForPurchase ? (
        <div>
          <BackInStockFormModal
            product={product}
            variantId={selectedVariant?._id}
          />
          <button
            data-testid={testIds.PRODUCT_DETAILS.ADD_TO_CART_CTA}
            aria-label="Notify When Available"
            className="btn-main w-full my-1 rounded-2xl"
            type="button"
            onClick={notifyWhenAvailable}
            disabled={loading}
          >
            Notify When Available
          </button>
        </div>
      ) : null}
      <p
        className="pb-4 break-words w-full max-w-xl mt-6"
        dangerouslySetInnerHTML={{ __html: product.description ?? '' }}
      />
      {product.additionalInfoSections?.length ? (
        <div className="mt-6">
          <Flowbite
            theme={{
              theme: {
                accordion: {
                  content: { base: 'bg-transparent p-5' },
                  title: {
                    heading: 'text-black',
                    arrow: {
                      base: 'text-black',
                    },
                  },
                },
              },
            }}
          >
            <Accordion flush={true} arrowIcon={HiArrowDown}>
              {product.additionalInfoSections!.map((info) => (
                <Accordion.Panel key={info.title}>
                  <Accordion.Title>
                    <span className="text-sm">{info.title}</span>
                  </Accordion.Title>
                  <Accordion.Content>
                    <span
                      className="text-sm"
                      dangerouslySetInnerHTML={{
                        __html: info.description ?? '',
                      }}
                    />
                  </Accordion.Content>
                </Accordion.Panel>
              ))}
            </Accordion>
          </Flowbite>
        </div>
      ) : null}
    </>
  );
};
