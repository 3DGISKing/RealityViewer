const link = document.createElement( 'a' );

function save( blob, filename ) {
    link.href = URL.createObjectURL( blob );
    link.download = filename || 'data.json';
    link.dispatchEvent( new MouseEvent( 'click' ) );

    // URL.revokeObjectURL( url ); breaks Firefox...
}

function saveStringAsTextFile( text, filename ) {
    save( new Blob( [ text ], { type: 'text/plain' } ), filename );
}

export {saveStringAsTextFile}