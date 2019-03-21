import getFieldsFromEntities from '../../introspection/getFieldsFromEntities';
import {
    getRelatedKey,
    getRelatedType,
    getRelationshipFromKey,
    getReverseRelatedField,
} from '../../nameConverter';
import { isRelationshipField } from '../../relationships';

/**
 * Add resolvers for relationship fields
 * 
 * @example
 * Consider this data:
 * 
 *     {
 *         posts: [
 *              { id: 1, title: 'Hello, world', user_id: 123 }
 *         ],
 *         users: [
 *              { id: 123, name: 'John Doe' }
 *         ]
 *         comments: [
 *              { id: 4646, post_id: 1, body: 'Nice post!' }
 *         ]
 *     }
 * 
 * There are two relationship fields here, posts.user_id and comments.post_id.
 * The generated GraphQL schema for posts is:
 * 
 *     type Post {
 *         id: ID!
 *         title: String
 *         user_id: ID
 *         User: User
 *         Comments: [Comment]
 *     }
 * 
 * When called for the posts entity, this method generates resolvers 
 * for Post.User and Post.Comments
 * 
 * @param {String} entityName The entity key in the data map, e.g. "posts"
 * @param {Object} data The entire data map, e.g. { posts: [], users: [] }
 * 
 * @return {Object} resolvers, e.g. 
 * 
 *     {
 *         Post: {
 *             User: (post) => users.find(user => user.id == post.user_id),
 *             Comments: (post) => comments.filter(comment => comment.post_id = post.id),
 *         },
 *     }
 */
export default (entityName, data) => {
    const entityFields = Object.keys(getFieldsFromEntities(data[entityName]));
/*    const manyToOneResolvers = entityFields.filter(isRelationshipField).reduce(
        (resolvers, fieldName) =>
            Object.assign({}, resolvers, {
                [getRelatedType(fieldName)]: entity =>
                    data[getRelatedKey(fieldName)].find(
                        relatedRecord => relatedRecord.id == entity[fieldName]
                    ),
            }),
        {}
    );
*/

    const manyToManyResolvers = entityFields.filter(isRelationshipField).reduce(
        (resolvers, fieldName) =>
            Object.assign({}, resolvers, {
                [getRelatedType(fieldName)]: (entity, args) => {
                    var result = data[getRelatedKey(fieldName)].filter(
                        relatedRecord => {
                            var keep = false;
                            if (entity[fieldName] == relatedRecord.id) {
                                keep = true;
                            }
                            if (entity[fieldName] && entity[fieldName].indexOf && (entity[fieldName].indexOf(relatedRecord.id) > -1)) {
                                keep = true;
                            }

                            if (keep && args.filter) {
                                for (var i in args.filter) {
                                    if (isRelationshipField(i)) {
                                        if (relatedRecord[i] && relatedRecord[i].indexOf(args.filter[i][0]) > -1) {
                                           return true;
                                        }

                                        const filteredRecords = data[getRelatedKey(i)].filter(
                                           filterRecord => {
                                              if (filterRecord.id != args.filter[i][0]) {
                                                 return false;
                                              }
                                              if (!filterRecord[fieldName]) {
                                                 return false;
                                              }
                                              if (filterRecord[fieldName].indexOf(relatedRecord.id) < 0) {
                                                 return false;
                                              }
                                              return true;
                                           }
                                        );

                                        if (!filteredRecords.length) {
                                           return false;
                                        }
                                        return true;
                                    } else {
                                      if (args.filter[i] == relatedRecord[i]) {
                                        return true;
                                      } else {
                                        return false;
                                      }
                                    }
                                }
                            }
                            return keep;
                        }
                    );

                    if (args.page !== undefined && args.perPage) {
                        var count = result.length;
                        result = result.slice(args.page * args.perPage, args.page * args.perPage + args.perPage);
                    }
                    return result;
                }
            }),
        {}
    );
    const relatedField = getReverseRelatedField(entityName); // 'posts' => 'post_id'
    const hasReverseRelationship = entityName =>
        getFieldsFromEntities(data[entityName]).hasOwnProperty(relatedField);
    const entities = Object.keys(data);
    const oneToManyResolvers = entities.filter(hasReverseRelationship).reduce(
        (resolvers, entityName) =>
            Object.assign({}, resolvers, {
                [getRelationshipFromKey(entityName)]: (entity, args) => {
                    var result = data[entityName].filter(
                        record => {
                            if (args.filter) {
                                for (var i in args.filter) {
                                    if (typeof record[i] === "object") {
                                        if (record[i].indexOf(args.filter[i][0]) < 0) {
                                            return false;
                                        }
                                    } else {
                                        if (record[i] != args.filter[i]) {
                                            return false;
                                        }
                                    }
                                }
                            }
                            if (record[relatedField] == entity.id) {
                               return true;
                            }
                            if (record[relatedField] && record[relatedField].indexOf && (record[relatedField].indexOf(entity.id) > -1)) {
                               return true;
                            }
                            return false;
			}
                    );
                    if (args.page !== undefined && args.perPage) {
                        var count = result.length;
                        result = result.slice(args.page * args.perPage, args.page * args.perPage + args.perPage);
                    }
                    return result;
                }
            }),
        {}
    );


    const countResolvers = entityFields.filter(isRelationshipField).reduce(
        (resolvers, fieldName) =>
            Object.assign({}, resolvers, {
                ['_' + getRelatedType(fieldName) + 'Count']: (entity, args) => {
                    var result = data[getRelatedKey(fieldName)].filter(
                        relatedRecord => {
                            var keep = false;
                            if (entity[fieldName] == relatedRecord.id) {
                                keep = true;
                            }
                            if (entity[fieldName] && entity[fieldName].indexOf && (entity[fieldName].indexOf(relatedRecord.id) > -1)) {
                                keep = true;
                            }

                            if (keep && args.filter) {
                                for (var i in args.filter) {
                                    if (isRelationshipField(i)) {
                                        if (relatedRecord[i] && relatedRecord[i].indexOf(args.filter[i][0]) > -1) {
                                           return true;
                                        }

                                        const filteredRecords = data[getRelatedKey(i)].filter(
                                           filterRecord => {
                                              if (filterRecord.id != args.filter[i][0]) {
                                                 return false;
                                              }
                                              if (!filterRecord[fieldName]) {
                                                 return false;
                                              }
                                              if (filterRecord[fieldName].indexOf(relatedRecord.id) < 0) {
                                                 return false;
                                              }
                                              return true;
                                           }
                                        );

                                        if (!filteredRecords.length) {
                                           return false;
                                        }
                                        return true;
                                    } else {
                                      if (args.filter[i] == relatedRecord[i]) {
                                        return true;
                                      } else {
                                        return false;
                                      }
                                    }
                                }
                            }
                            return keep;
                        }
                    );
                    return result.length;
                }
            }),
        {}
    );

//    return Object.assign({}, manyToOneResolvers, oneToManyResolvers);
    return Object.assign({}, manyToManyResolvers, oneToManyResolvers, countResolvers);

};
