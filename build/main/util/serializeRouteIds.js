"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deserializeRouteIds = exports.serializeRouteIds = void 0;
function serializeRouteIds(routeIds) {
    return routeIds.join(':');
}
exports.serializeRouteIds = serializeRouteIds;
function deserializeRouteIds(routeIds) {
    return routeIds.split(':').map(Number);
}
exports.deserializeRouteIds = deserializeRouteIds;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VyaWFsaXplUm91dGVJZHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvdXRpbC9zZXJpYWxpemVSb3V0ZUlkcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxTQUFnQixpQkFBaUIsQ0FBQyxRQUFrQjtJQUNsRCxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDNUIsQ0FBQztBQUZELDhDQUVDO0FBRUQsU0FBZ0IsbUJBQW1CLENBQUMsUUFBZ0I7SUFDbEQsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN6QyxDQUFDO0FBRkQsa0RBRUMifQ==