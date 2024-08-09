exports.translateUnits = (source, lang) => {
  const units = source.map((unit) => {
    if (unit === '2000cw/s')
      return {
        value: unit,
        number: 2000,
        short: lang('units.short.2000cw/s'),
        displayedValue: lang('units.2000cw/s'),
      };
    else if (unit === 'word')
      return {
        value: unit,
        number: 1,
        short: lang('units.short.word'),
        displayedValue: land('units.word'),
      };
    else if (unit === '300w')
      return {
        value: unit,
        number: 300,
        short: lang('units.short.300w'),
        displayedValue: lang('units.300w'),
      };
    else
      return {
        value: unit,
        number: 1800,
        short: lang('units.short.1800cw/os'),
        displayedValue: lang('units.1800cw/os'),
      };
  });

  if (units.length === 1) return units[0];

  return units;
};

exports.translateServices = (source, lang) => {
  const services = source.map((service) => {
    if (service === 'translation')
      return {
        value: service,
        displayedValue: lang('services.translation'),
      };
    if (service === 'proofreading')
      return {
        value: service,
        displayedValue: lang('services.proofreading'),
      };
    if (service === 'postediting')
      return {
        value: service,
        displayedValue: lang('services.postediting'),
      };
  });
  if (services.length === 1) return services[0];

  return services;
};
