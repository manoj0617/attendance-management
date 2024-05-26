const Joi = require('joi');

downloadSchema=Joi.object({
    from:Joi.date().required(),
    to:Joi.date().required(),
    course:Joi.string().required()
});


module.exports=downloadSchema;