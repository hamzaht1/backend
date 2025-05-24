const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  adresse: {
    type: String,
    required: true
  },
  coordonnees: {
    lat: { type: Number, required: true },
    long: { type: Number, required: true }
  }
});

const Location = mongoose.model('Location', locationSchema);

module.exports = { Driver, Location };