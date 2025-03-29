const {
  BooleanField, IntegerSortField, SchemaField, StringField, TypedObjectField,
} = foundry.data.fields;

export default class ObjectiveField extends TypedObjectField {
  constructor(fields = {}) {
    super(new SchemaField({
      text: new StringField({ required: true }),
      checked: new BooleanField(),
      sort: new IntegerSortField(),
      ...fields,
    }), {
      validateKey: key => foundry.data.validators.isValidId(key),
    });
  }
}
