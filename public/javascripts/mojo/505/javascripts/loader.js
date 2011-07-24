/*jslint evil: true */
// Place scripts here that have to load prior to the framework loading (i.e. Prototype)
// mojo.js will not load this file when there is a built-in framework, instead loading framework.js directly.

/**
 * @name loader.js
 * @fileOverview Nothing to see here, move along.
Copyright 2009 Palm, Inc.  All rights reserved.
 *  
*/


document.write('<script type="text/javascript" src="/usr/palm/frameworks/mojo' + Mojo.generateFrameworkHome() + '/javascripts/prototype.js"><\/script>');
document.write('<script type="text/javascript" src="/usr/palm/frameworks/mojo' + Mojo.generateFrameworkHome() + '/javascripts/framework.js"><\/script>');