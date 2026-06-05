const bcrypt = require("bcryptjs");
const User = require("../models/User");

const PORTAL_USERS = [
	{
		firstName: "Admin",
		lastName: "Lala",
		email: "admin@lalapasteleria.com",
		phone: "3001000001",
		password: "Admin123*",
		role: "admin"
	},
	{
		firstName: "Seller",
		lastName: "Lala",
		email: "seller@lalapasteleria.com",
		phone: "3001000002",
		password: "Seller123*",
		role: "seller"
	}
];

const ensurePortalUsers = async () => {
	for (const portalUser of PORTAL_USERS) {
		const hashedPassword = await bcrypt.hash(portalUser.password, 10);
		const existing = await User.findOne({ email: portalUser.email });

		if (existing) {
			existing.firstName = portalUser.firstName;
			existing.lastName = portalUser.lastName;
			existing.phone = portalUser.phone;
			existing.password = hashedPassword;
			existing.role = portalUser.role;
			await existing.save();
			console.log(`✓ Usuario portal actualizado: ${portalUser.email}`);
			continue;
		}

		await User.create({
			...portalUser,
			password: hashedPassword
		});
		console.log(`✓ Usuario portal creado: ${portalUser.email}`);
	}
};

module.exports = {
	ensurePortalUsers,
	PORTAL_USERS
};
