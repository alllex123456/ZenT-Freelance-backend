exports.generateXMLInvoice = (invoice) => {
  const { prefix, number, issuedDate, dueDate, notes } = invoice;
  const providerStreetAddress = invoice.userData.streetAddress;
  const providerCity = invoice.userData.city;
  const providerCountry = invoice.userData.country.slice(0, 2);
  const providerCountryCounty = `${invoice.userData.country.slice(0, 2)}-${
    invoice.userData.county
  }`;
  const providerCNP = invoice.userId.cnp;
  const providerTaxNumber = invoice.userData.taxNumber;
  const providerName = invoice.userData.name;
  const providerPhone = invoice.userData.phone;
  const providerEmail = invoice.userData.email;
  const providerIBAN = invoice.userId.bankAccounts[0].iban;

  const currency = invoice.clientId.currency;
  const clientStreetAddress = invoice.clientData.streetAddress;
  const clientCity = invoice.clientData.city;
  const clientCountry = invoice.clientData.country;
  const clientCountryCounty = `${invoice.userData.country}-${invoice.userData.county}`;
  const clientName = invoice.clientData.name;
  const clientTaxNumber = invoice.clientData.taxNumber;
  const clientPhone = invoice.clientData.phone;
  const clientEmail = invoice.clientData.email;

  const quantity = 1;

  const items = invoice.detailedOrders
    ? invoice.orders.concat(invoice.addedItems)
    : invoice.addedItems;

  const totalInvoiced =
    items.reduce(
      (acc, item) =>
        (acc += item.total + (item.total * invoice.userData.VATrate) / 100),
      0
    ) + invoice.previousClientBalance;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:ns4="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2 http://docs.oasis-open.org/ubl/os-UBL-2.1/xsd/maindoc/UBL-Invoice-2.1.xsd">
 <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>
<cbc:ID>${prefix}${number}</cbc:ID>
<cbc:IssueDate>${issuedDate.slice(0, 10)}</cbc:IssueDate>
<cbc:DueDate>${dueDate.slice(0, 10)}</cbc:DueDate>
<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
<cbc:Note>${notes}</cbc:Note>
<cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
<cac:AccountingSupplierParty>
<cac:Party>
<cac:PostalAddress>
<cbc:StreetName>${providerStreetAddress}</cbc:StreetName>
<cbc:CityName>${providerCity}</cbc:CityName>
<cbc:CountrySubentity>${providerCountryCounty}</cbc:CountrySubentity>
<cac:Country>
<cbc:IdentificationCode>${providerCountry}</cbc:IdentificationCode>
</cac:Country>
</cac:PostalAddress>
<cac:PartyTaxScheme>
<cbc:CompanyID>${providerCNP || providerTaxNumber}</cbc:CompanyID>
<cac:TaxScheme/>
</cac:PartyTaxScheme>
<cac:PartyLegalEntity>
<cbc:RegistrationName>${providerName}</cbc:RegistrationName>
<cbc:CompanyID>-</cbc:CompanyID>
</cac:PartyLegalEntity>
<cac:Contact>
<cbc:Telephone>${providerPhone}</cbc:Telephone>
<cbc:ElectronicMail>${providerEmail}</cbc:ElectronicMail>
</cac:Contact>
</cac:Party>
</cac:AccountingSupplierParty>
<cac:AccountingCustomerParty>
<cac:Party>
<cac:PostalAddress>
<cbc:StreetName>${clientStreetAddress}</cbc:StreetName>
<cbc:CityName>${clientCity}</cbc:CityName>
<cbc:CountrySubentity>${clientCountryCounty}</cbc:CountrySubentity>
<cac:Country>
<cbc:IdentificationCode>${clientCountry}</cbc:IdentificationCode>
</cac:Country>
</cac:PostalAddress>
<cac:PartyLegalEntity>
<cbc:RegistrationName>${clientName}</cbc:RegistrationName>
<cbc:CompanyID>${clientTaxNumber}</cbc:CompanyID>
</cac:PartyLegalEntity>
<cac:Contact>
<cbc:Telephone>${clientPhone}</cbc:Telephone>
<cbc:ElectronicMail>${clientEmail}</cbc:ElectronicMail>
</cac:Contact>
</cac:Party>
</cac:AccountingCustomerParty>
<cac:PaymentMeans>
<cbc:PaymentMeansCode name="Payment to bank account">42</cbc:PaymentMeansCode>
<cbc:PaymentID>1</cbc:PaymentID>
<cac:PayeeFinancialAccount>
<cbc:ID>${providerIBAN}</cbc:ID>
</cac:PayeeFinancialAccount>
</cac:PaymentMeans>
<cac:TaxTotal>
<cbc:TaxAmount currencyID="RON">0.00</cbc:TaxAmount>
<cac:TaxSubtotal>
<cbc:TaxableAmount currencyID="RON">${totalInvoiced}</cbc:TaxableAmount>
<cbc:TaxAmount currencyID="RON">0.00</cbc:TaxAmount>
<cac:TaxCategory>
<cbc:ID>O</cbc:ID>
<cbc:TaxExemptionReasonCode>VATEX-EU-O</cbc:TaxExemptionReasonCode>
<cbc:TaxExemptionReason>Entitatea nu este inregistrata in scopuri de TVA</cbc:TaxExemptionReason>
<cac:TaxScheme>
<cbc:ID>VAT</cbc:ID>
</cac:TaxScheme>
</cac:TaxCategory>
</cac:TaxSubtotal>
</cac:TaxTotal>
<cac:LegalMonetaryTotal>
<cbc:LineExtensionAmount currencyID="RON">${totalInvoiced}</cbc:LineExtensionAmount>
<cbc:TaxExclusiveAmount currencyID="RON">${totalInvoiced}</cbc:TaxExclusiveAmount>
<cbc:TaxInclusiveAmount currencyID="RON">${totalInvoiced}</cbc:TaxInclusiveAmount>
<cbc:AllowanceTotalAmount currencyID="RON">0</cbc:AllowanceTotalAmount>
<cbc:PrepaidAmount currencyID="RON">0.00</cbc:PrepaidAmount>
<cbc:PayableAmount currencyID="RON">${totalInvoiced}</cbc:PayableAmount>
</cac:LegalMonetaryTotal>
<cac:InvoiceLine>
<cbc:ID>1</cbc:ID>
<cbc:InvoicedQuantity unitCode="H87">${quantity}</cbc:InvoicedQuantity>
<cbc:LineExtensionAmount currencyID="RON">${totalInvoiced}</cbc:LineExtensionAmount>
<cac:Item>
<cbc:Name>Servicii de traducere</cbc:Name>
<cac:ClassifiedTaxCategory>
<cbc:ID>O</cbc:ID>
<cac:TaxScheme>
<cbc:ID>VAT</cbc:ID>
</cac:TaxScheme>
</cac:ClassifiedTaxCategory>
</cac:Item>
<cac:Price>
<cbc:PriceAmount currencyID="RON">${totalInvoiced}</cbc:PriceAmount>
</cac:Price>
</cac:InvoiceLine>
</Invoice>`;
};
