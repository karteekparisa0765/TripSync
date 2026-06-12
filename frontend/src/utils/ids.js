export const getEntityId = (entity) => {
  if (!entity) return '';
  if (typeof entity === 'string') return entity;
  return entity.id || entity._id || '';
};
