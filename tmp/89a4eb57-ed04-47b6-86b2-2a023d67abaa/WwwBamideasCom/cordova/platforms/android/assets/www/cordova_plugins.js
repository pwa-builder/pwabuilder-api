cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "file": "plugins/com.microsoft.hostedwebapp/www/hostedWebApp.js",
        "id": "com.microsoft.hostedwebapp.hostedwebapp",
        "clobbers": [
            "hostedwebapp"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.network-information/www/network.js",
        "id": "org.apache.cordova.network-information.network",
        "clobbers": [
            "navigator.connection",
            "navigator.network.connection"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.network-information/www/Connection.js",
        "id": "org.apache.cordova.network-information.Connection",
        "clobbers": [
            "Connection"
        ]
    }
];
module.exports.metadata = 
// TOP OF METADATA
{
    "com.microsoft.hostedwebapp": "0.0.1",
    "org.apache.cordova.network-information": "0.2.15"
}
// BOTTOM OF METADATA
});