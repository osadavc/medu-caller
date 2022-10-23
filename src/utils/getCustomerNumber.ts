const getCustomerNumber = (body: any) => {
  if (body.Direction == "inbound") {
    return body.From;
  } else {
    return body.To;
  }
};

export default getCustomerNumber;
