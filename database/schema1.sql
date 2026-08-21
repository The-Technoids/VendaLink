-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.vendors (
  vendorid integer NOT NULL DEFAULT nextval('vendors_vendorid_seq'::regclass),
  businessname character varying NOT NULL,
  ownername character varying,
  phonenumber character varying NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  locationdescription character varying,
  isopen boolean DEFAULT true,
  paymenttypes character varying DEFAULT 'Cash, EFT, SnapScan'::character varying,
  createdat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT vendors_pkey PRIMARY KEY (vendorid)
);
CREATE TABLE public.categories (
  categoryid integer NOT NULL DEFAULT nextval('categories_categoryid_seq'::regclass),
  categoryname character varying NOT NULL,
  CONSTRAINT categories_pkey PRIMARY KEY (categoryid)
);
CREATE TABLE public.products (
  productid integer NOT NULL DEFAULT nextval('products_productid_seq'::regclass),
  vendorid integer,
  categoryid integer,
  productname character varying NOT NULL,
  price numeric NOT NULL,
  isavailable boolean DEFAULT true,
  updatedat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT products_pkey PRIMARY KEY (productid),
  CONSTRAINT products_vendorid_fkey FOREIGN KEY (vendorid) REFERENCES public.vendors(vendorid),
  CONSTRAINT products_categoryid_fkey FOREIGN KEY (categoryid) REFERENCES public.categories(categoryid)
);
CREATE TABLE public.customerreviews (
  reviewid integer NOT NULL DEFAULT nextval('customerreviews_reviewid_seq'::regclass),
  vendorid integer,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment character varying,
  isverifiedvisit boolean DEFAULT false,
  createdat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT customerreviews_pkey PRIMARY KEY (reviewid),
  CONSTRAINT customerreviews_vendorid_fkey FOREIGN KEY (vendorid) REFERENCES public.vendors(vendorid)
);