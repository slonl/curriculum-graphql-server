export default (entityData = []) => (_, { id, title }) =>
    entityData.find(d => (d.id == id || d.title == title));
