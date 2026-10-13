/**
 * Products used by the tests, referenced by visible name + API id.
 * Prices are intentionally NOT hard-coded: tests read them from the product
 * page / API at run time so a catalogue price change does not break the suite.
 */
export const Products = {
  samsungGalaxyS6: { id: 1, name: 'Samsung galaxy s6', category: 'phone' },
  nokiaLumia1520: { id: 2, name: 'Nokia lumia 1520', category: 'phone' },
  nexus6: { id: 3, name: 'Nexus 6', category: 'phone' },
  sonyVaioI5: { id: 8, name: 'Sony vaio i5', category: 'notebook' },
  appleMonitor24: { id: 10, name: 'Apple monitor 24', category: 'monitor' },
} as const;

export type Product = (typeof Products)[keyof typeof Products];

/** UI category link label -> API category key */
export const Categories = {
  Phones: 'phone',
  Laptops: 'notebook',
  Monitors: 'monitor',
} as const;

export const Messages = {
  login: {
    emptyFields: 'Please fill out Username and Password.',
    wrongPassword: 'Wrong password.',
    userNotFound: 'User does not exist.',
  },
  signup: {
    success: 'Sign up successful.',
    userExists: 'This user already exist.',
  },
  cart: {
    // Logged-in users get "Product added." and guests "Product added" (no period).
    productAdded: /^Product added\.?$/,
  },
  order: {
    missingFields: 'Please fill out Name and Creditcard.',
    success: 'Thank you for your purchase!',
  },
} as const;
