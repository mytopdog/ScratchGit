const {app, BrowserWindow} = require('electron');

console.log(process.argv);
	
function cWindow() {
	let win = new BrowserWindow({width: 800, height: 600});

	win.on('closed', () => {
		win = null;
	});
	
	win.loadURL('https://beta.scratch.mit.edu');
	
	win.webContents.executeJavaScript("document.getElementsByClassName('preview-modal_ok-button_2Ubef')[0].click();document.getElementsByClassName('menu-bar_menu-bar-item_oLDa-')[2].click();document.getElementsByClassName('menu_menu-section_2U-v6')[1].click();");
}

app.on("ready", cWindow);