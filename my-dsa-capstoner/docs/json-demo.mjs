const event ={ id: 'event1',title: "Lagos event", city:'Lagos', date:'2024-06-15', tiers:['general', 'VIP']}

const text = JSON.stringify(event);

console.log(text);
console.log(JSON.parse(text));