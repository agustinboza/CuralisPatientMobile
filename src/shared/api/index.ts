// This file is the "API Factory".
// It exports the correct API service based on the `useMock` flag.
// To switch between real and mock data, just change this flag.

import realApi from './realApi';
export default realApi; 