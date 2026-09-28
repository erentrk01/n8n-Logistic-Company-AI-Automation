// Mode: Run Once for Each Item
const order = $('Build TMS Order').item.json;
const tms = $('TMS: Create Order').item.json;
return {
  json: {
    opportunityId: order.opportunityId,
    orderNo: tms.orderNo,
    slackText: [
      `:white_check_mark: *Auftrag an TMS übergeben* – ${tms.orderNo}${tms.status === 'duplicate' ? ' (bereits vorhanden)' : ''}`,
      `*Auftrag:* ${order.opportunityName}`,
      `*Strecke:* ${order.tmsOrder.route}`,
      `*Frachtpfl. Gewicht:* ${order.tmsOrder.chargeableKg} kg`,
    ].join('\n'),
  },
};
