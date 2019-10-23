import applyFilters from './applyFilters';

export default entityData => (_, { filter = {} }) => {
    let items = applyFilters(entityData, filter);
    items = items.filter(function(entry) {
        if (entry.id < 0) {
            return false;
        }
        return true;
    });

    return { count: items.length };
};
