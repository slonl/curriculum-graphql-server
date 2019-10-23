import applyFilters from './applyFilters';

export default (entityData = []) => (
    _,
    { sortField, sortOrder = 'asc', page, perPage = 25, filter = {} }
) => {
    let items = [...entityData];

    if (sortField) {
        const direction = sortOrder.toLowerCase() == 'asc' ? 1 : -1;
        items = items.sort((a, b) => {
            if (a[sortField] > b[sortField]) {
                return direction;
            }
            if (a[sortField] < b[sortField]) {
                return -1 * direction;
            }
            return 0;
        });
    }

    // remove items with negative ID
    items = items.filter(function(entry) {
       if (entry.id < 0) {
          return false;
       }
       return true;
    });

    items = applyFilters(items, filter);

    if (page !== undefined && perPage) {
        items = items.slice(page * perPage, page * perPage + perPage);
    }

    return items;
};
