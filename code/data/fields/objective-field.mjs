const {
  BooleanField, NumberField, SchemaField, StringField, TypedObjectField,
} = foundry.data.fields;

export default class ObjectiveField extends TypedObjectField {
  constructor(fields = {}) {
    super(new SchemaField({
      text: new StringField({ required: true }),
      checked: new BooleanField(),
      sort: new NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      ...fields,
    }), {
      validateKey: key => foundry.data.validators.isValidId(key),
    });
  }
}
