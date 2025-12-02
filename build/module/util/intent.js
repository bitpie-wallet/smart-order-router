// NOTE: intent is a routing-api concept,
// but we have to introduce this strongly-typed enum in SOR to ensure some codepath only gets executed during async path
export var INTENT;
(function (INTENT) {
    INTENT["CACHING"] = "caching";
    INTENT["QUOTE"] = "quote";
    INTENT["SWAP"] = "swap";
    INTENT["PRICING"] = "pricing";
})(INTENT || (INTENT = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3V0aWwvaW50ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHlDQUF5QztBQUN6Qyx3SEFBd0g7QUFDeEgsTUFBTSxDQUFOLElBQVksTUFLWDtBQUxELFdBQVksTUFBTTtJQUNoQiw2QkFBbUIsQ0FBQTtJQUNuQix5QkFBZSxDQUFBO0lBQ2YsdUJBQWEsQ0FBQTtJQUNiLDZCQUFtQixDQUFBO0FBQ3JCLENBQUMsRUFMVyxNQUFNLEtBQU4sTUFBTSxRQUtqQiJ9