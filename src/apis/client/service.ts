import repository from '../../repository/repository.js';
import type {
  ClientSettings,
  CustomerFieldSettings,
  GetClientResponse,
  UpdateClientResponse,
  UpdateClientRequest,
  ClientData,
} from './dto.js';

export const defaultCustomerFieldSettings: CustomerFieldSettings = {
  address: false,
  gstNo: false,
  emailId: false,
};

export const buildClientSettings = (client: any): ClientSettings => {
  const customerFields =
    client?.clientSettings?.customerFields || defaultCustomerFieldSettings;
  return {
    customerFields: {
      ...defaultCustomerFieldSettings,
      ...customerFields,
    },
  };
};

// Get client details
export const getClientDetails = async (clientId: string): Promise<GetClientResponse> => {
  try {
    const client = await repository.findById('clients', clientId, '-passwordHash');
    if (!client) {
      throw new Error('Client not found');
    }
    const clientObject = client.toObject();
    clientObject.clientSettings = buildClientSettings(clientObject);
    return {
      success: true,
      client: clientObject,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

// Update client profile fields (immutable phone number)
export const updateClientProfile = async (
  clientId: string,
  updateData: UpdateClientRequest
): Promise<UpdateClientResponse> => {
  const allowedFields = [
    'ownerName',
    'businessName',
    'shopName',
    'location',
    'city',
    'state',
    'gstin',
    'profileUrl',
    'clientSettings',
  ];

  const requestedCustomerFields =
    updateData?.clientSettings?.customerFields || null;
  let sanitizedCustomerFields = null;
  if (requestedCustomerFields) {
    const existingClient =
      await repository.findById('clients', clientId, 'clientSettings');
    const existingSettings = buildClientSettings(existingClient || {});
    sanitizedCustomerFields = {
      ...existingSettings.customerFields,
      ...Object.entries(requestedCustomerFields).reduce((acc, [key, value]) => {
        if (
          Object.prototype.hasOwnProperty.call(
            existingSettings.customerFields,
            key,
          )
        ) {
          acc[key] = Boolean(value);
        }
        return acc;
      }, {}),
    };
  }

  const sanitizedUpdate = Object.entries(updateData || {})
    .filter(([key]) => allowedFields.includes(key))
    .reduce((acc, [key, value]) => {
      if (key === 'clientSettings') {
        if (sanitizedCustomerFields) {
          acc.clientSettings = {
            customerFields: sanitizedCustomerFields,
          };
        }
        return acc;
      }
      acc[key] = value;
      return acc;
    }, {});

  if (!Object.keys(sanitizedUpdate).length) {
    throw new Error('No updates provided');
  }

  try {
    const client = await repository.findById('clients', clientId, '-passwordHash');
    if (!client) {
      throw new Error('Client not found');
    }

    Object.entries(sanitizedUpdate).forEach(([key, value]) => {
      if (key !== 'clientSettings') {
        client[key] = value;
      }
    });

    if (sanitizedCustomerFields) {
      client.set('clientSettings.customerFields', sanitizedCustomerFields);
      client.markModified('clientSettings.customerFields');
    }

    client.updatedAt = new Date();
    await client.save();

    const clientObject = client.toObject();
    clientObject.clientSettings = buildClientSettings(clientObject);
    return { success: true, client: clientObject };
  } catch (error) {
    throw new Error(error.message);
  }
};
