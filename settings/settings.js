var Life360Settings = {};
var defaultSettings = {
    "synctime": 3,
    "homerange": 100,
    "invisble": false,
    "username" : "",
    "password" : ""
};

function onHomeyReady( Homey ){
        console.log( "ready!" );
        showPanel(1);
        Homey.ready();
}

function showLogs() {
	Homey.api('GET', 'getlogs/', (err, result) => {
		if (!err) {
			document.getElementById('loglines').innerHTML = '';
			for (let i = (result.length - 1); i >= 0; i -= 1) {
				document.getElementById('loglines').innerHTML += result[i];
				document.getElementById('loglines').innerHTML += '<br />';
			}
		}
	});
}
function deleteLogs() {
	Homey.api('GET', 'deletelogs/', (err) => {
		if (err) {
			Homey.alert(err.message, 'error'); 
		} else { Homey.alert('Logs deleted!', 'info'); }
	});
}

function showPanel(panel) {
	$('.panel').hide();
	$('.panel-button').removeClass('panel-button-active').addClass('panel-button-inactive');
	$('#panel-button-' + panel).removeClass('panel-button-inactive').addClass('panel-button-active');
	$('#panel-' + panel).show();
	if (panel === 1) {
		showLogs();
	}
}
