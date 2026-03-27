export const baseSchemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret) {
      if (ret._id) {
        ret.id = ret._id.toString();
        delete ret._id;
      }

      return ret;
    },
  },
  toObject: {
    virtuals: true,
  },
};
