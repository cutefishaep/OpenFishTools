var ns = "FishTools";

var tools = {};

function generateRandomNumber() {
    return Math.random();
}

var executeTool = function (toolName) {
    var args = Array.prototype.slice.call(arguments, 1);
    try {
        var result = tools[toolName].apply(null, args);
        if (typeof result === "string") return result;
        return result ? "true" : "false";
    } catch (error) {
        return '{"error":true,"tool":"' + toolName + '","type":"error","message":"' + error.toString().replace(/"/g, "'") + ' (Line ' + error.line + ')"}';
    }
};
