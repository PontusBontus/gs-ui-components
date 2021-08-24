"use strict";

const GSUI = Object.freeze( {

	noop() {},
	dragshield: document.createElement( "gsui-dragshield" ),

	// .........................................................................
	clamp( n, min, max ) {
		return (
			min < max
				? Math.max( min, Math.min( n || 0, max ) )
				: Math.max( max, Math.min( n || 0, min ) )
		);
	},

	// .........................................................................
	diffObjects( a, b ) {
		let empty = true;
		const diff = Object.entries( b ).reduce( ( diff, [ bk, bv ] ) => {
				const av = a[ bk ],
					newval = av === bv ? undefined :
						typeof bv !== "object" || bv === null ? bv :
						typeof av !== "object" || av === null
							? Object.freeze( JSON.parse( JSON.stringify( bv ) ) )
							: GSUI.diffObjects( av, bv );

				if ( newval !== undefined ) {
					empty = false;
					diff[ bk ] = newval;
				}
				return diff;
			}, {} );

		Object.keys( a ).forEach( ak => {
			if ( !( ak in b ) ) {
				empty = false;
				diff[ ak ] = undefined;
			}
		} );
		return empty ? undefined : Object.freeze( diff );
	},

	// .........................................................................
	findElements( root, graph ) {
		return typeof graph === "string"
			? GSUI._findElemStr( root, graph )
			: Object.freeze( Array.isArray( graph )
				? GSUI._findElemArr( root, graph )
				: GSUI._findElemObj( root, graph ) );
	},
	_findElemArr( root, arr ) {
		return arr.map( sel => GSUI.findElements( root, sel ) );
	},
	_findElemObj( root, obj ) {
		const ent = Object.entries( obj );

		ent.forEach( kv => kv[ 1 ] = GSUI.findElements( root, kv[ 1 ] ) );
		return Object.fromEntries( ent );
	},
	_findElemStr( root, sel ) {
		if ( Array.isArray( root ) ) {
			let el;

			Array.prototype.find.call( root, r => el = GSUI._findElemQuery( r, sel ) );
			return el || null;
		}
		return GSUI._findElemQuery( root, sel );
	},
	_findElemQuery( root, sel ) {
		return root.matches( sel )
			? root
			: root.querySelector( sel );
	},

	// .........................................................................
	dispatchEvent( el, component, eventName, ...args ) {
		el.dispatchEvent( new CustomEvent( "gsuiEvents", {
			bubbles: true,
			detail: { component, eventName, args },
		} ) );
	},
	listenEvents( el, cbs ) {
		el.addEventListener( "gsuiEvents", e => {
			const d = e.detail,
				cbs2 = cbs[ d.component ] || cbs.default,
				fn = cbs2 && ( cbs2[ d.eventName ] || cbs2.default );

			if ( fn && fn( d, e.target, e ) !== true ) {
				e.stopPropagation();
				e.stopImmediatePropagation();
			}
		} );
	},

	// .........................................................................
	_templates: new Map(),
	setTemplate( tmpId, fn ) {
		GSUI._templates.set( tmpId, fn );
	},
	getTemplate( tmpId, ...args ) {
		return GSUI._templates.get( tmpId )( ...args );
	},

	// .........................................................................
	createElement( tag, attr, ...children ) {
		return GSUI._createElement( document.createElement( tag ), attr, children );
	},
	createElementNS( tag, attr, ...children ) {
		return GSUI._createElement( document.createElementNS( "http://www.w3.org/2000/svg", tag ), attr, children );
	},
	_createElement( el, attr, children ) {
		if ( attr ) {
			Object.entries( attr ).forEach( ( [ attr, val ] ) => {
				if ( val !== false && val !== null && val !== undefined ) {
					el.setAttribute( attr, val === true ? "" : val );
				}
			} );
		}
		el.append( ...children.flat( 1 ).filter( Boolean ) );
		return el;
	},

	// .........................................................................
	observeSizeOf( el, fn ) {
		if ( GSUI._resizeMap.has( el ) ) {
			GSUI._resizeMap.get( el ).push( fn );
		} else {
			GSUI._resizeMap.set( el, [ fn ] );
		}
		GSUI._resizeObs.observe( el );
	},
	unobserveSizeOf( el, fn ) {
		const fns = GSUI._resizeMap.get( el ),
			fnInd = fns.indexOf( fn );

		GSUI._resizeObs.unobserve( el );
		if ( fnInd > -1 ) {
			fns.splice( fnInd, 1 );
			if ( fns.length === 0 ) {
				GSUI._resizeMap.delete( el );
			}
		}
	},
	_resizeMap: new Map(),
	_resizeObs: new ResizeObserver( entries => {
		entries.forEach( e => {
			GSUI._resizeMap.get( e.target )
				.forEach( fn => fn( e.contentRect.width, e.contentRect.height ) );
		} );
	} ),

	// .........................................................................
	unselectText() {
		window.getSelection().removeAllRanges();
	},
	setAttribute( el, attr, valBrut ) {
		const val = arguments.length === 2 || valBrut;

		val !== false && val !== null && val !== undefined
			? el.setAttribute( attr, val === true ? "" : val )
			: el.removeAttribute( attr );
	},

	// .........................................................................
	recallAttributes( el, props ) {
		Object.entries( props ).forEach( ( [ p, val ] ) => {
			el.hasAttribute( p )
				? el.attributeChangedCallback( p, null, el.getAttribute( p ) )
				: GSUI.setAttribute( el, p, val );
		} );
	},
} );

document.body.prepend( GSUI.dragshield );
